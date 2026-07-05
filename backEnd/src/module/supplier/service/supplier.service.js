import Supplier, { SUPPLIER_STATUSES } from "../../../DB/model/Supplier.model.js";
import PurchaseOrder from "../../../DB/model/PurchaseOrder.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

export const listSuppliers = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: regex },
      { company: regex },
      { phone: regex },
    ];
  }
  if (status && SUPPLIER_STATUSES.includes(status)) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Supplier.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getSupplierById = async (id) => {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw new AppError("Supplier not found.", 404);
  return supplier;
};

export const createSupplier = async (payload = {}) => {
  const { name, company, contactPerson, email, phone, alternativePhone, address, city, taxId, paymentTerms, productsSupplied, productNames, notes } = payload;

  if (!name || !String(name).trim()) throw new AppError("Supplier name is required.", 400);

  const existing = await Supplier.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(String(name).trim())}$`, "i") } }).lean();
  if (existing) throw new AppError("A supplier with this name already exists.", 409);

  const supplier = await Supplier.create({
    name: String(name).trim(),
    company: String(company || "").trim(),
    contactPerson: String(contactPerson || "").trim(),
    email: String(email || "").trim(),
    phone: String(phone || "").trim(),
    alternativePhone: String(alternativePhone || "").trim(),
    address: String(address || "").trim(),
    city: String(city || "").trim(),
    taxId: String(taxId || "").trim(),
    paymentTerms: String(paymentTerms || "net30").trim(),
    productsSupplied: productsSupplied || [],
    productNames: productNames || [],
    notes: String(notes || "").trim(),
  });

  return supplier;
};

export const updateSupplier = async (id, payload = {}) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  const allowed = ["name", "company", "contactPerson", "email", "phone", "alternativePhone", "address", "city", "taxId", "paymentTerms", "productsSupplied", "productNames", "notes", "status"];
  for (const field of allowed) {
    if (payload[field] !== undefined) {
      if (field === "name") {
        const trimmed = String(payload[field]).trim();
        if (!trimmed) throw new AppError("Supplier name cannot be empty.", 400);
        const dup = await Supplier.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(trimmed)}$`, "i") }, _id: { $ne: id } }).lean();
        if (dup) throw new AppError("A supplier with this name already exists.", 409);
        supplier[field] = trimmed;
      } else if (field === "status") {
        if (!SUPPLIER_STATUSES.includes(payload[field])) throw new AppError("Invalid supplier status.", 400);
        supplier[field] = payload[field];
      } else {
        supplier[field] = payload[field];
      }
    }
  }

  await supplier.save();
  return supplier;
};

export const deleteSupplier = async (id) => {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw new AppError("Supplier not found.", 404);

  const pendingOrders = await PurchaseOrder.countDocuments({ supplier: id, status: { $in: ["draft", "pending", "approved", "ordered"] } });
  if (pendingOrders > 0) {
    throw new AppError("Cannot delete supplier with pending purchase orders. Cancel or receive all orders first.", 400);
  }

  await Supplier.findByIdAndDelete(id);
  return { message: "Supplier deleted." };
};

export const recordPurchaseOrder = async (supplierId, orderData = {}) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  supplier.purchaseHistory.push({
    orderId: orderData.orderId || "",
    date: orderData.date || new Date(),
    total: Number(orderData.total) || 0,
    status: orderData.status || "pending",
    itemCount: Number(orderData.itemCount) || 0,
  });

  supplier.totalPurchases = (supplier.totalPurchases || 0) + (Number(orderData.total) || 0);
  supplier.lastPurchaseDate = new Date();
  if (orderData.status !== "cancelled") {
    supplier.outstandingBalance = (supplier.outstandingBalance || 0) + (Number(orderData.total) || 0);
  }

  await supplier.save();
  return supplier;
};

export const recordDelivery = async (supplierId, onTime, delayMinutes = 0) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  supplier.deliveryHistory.push({
    date: new Date(),
    onTime: Boolean(onTime),
    delayMinutes: Math.max(Number(delayMinutes) || 0, 0),
  });

  const recent = supplier.deliveryHistory.slice(-20);
  const onTimeCount = recent.filter((d) => d.onTime).length;
  supplier.rating = recent.length > 0 ? Number(((onTimeCount / recent.length) * 5).toFixed(1)) : 0;

  await supplier.save();
  return supplier;
};

export const getOutstandingBalances = async () => {
  const suppliers = await Supplier.find({ outstandingBalance: { $gt: 0 } })
    .select("name company phone outstandingBalance totalPurchases lastPurchaseDate")
    .sort({ outstandingBalance: -1 })
    .lean();

  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  return { suppliers, totalOutstanding, count: suppliers.length };
};

export const getSupplierPerformance = async (id) => {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw new AppError("Supplier not found.", 404);

  const deliveries = supplier.deliveryHistory || [];
  const totalDeliveries = deliveries.length;
  const onTimeDeliveries = deliveries.filter((d) => d.onTime).length;
  const lateDeliveries = deliveries.filter((d) => !d.onTime);
  const avgDelay = lateDeliveries.length > 0
    ? Number((lateDeliveries.reduce((sum, d) => sum + (d.delayMinutes || 0), 0) / lateDeliveries.length).toFixed(1))
    : 0;

  const purchases = supplier.purchaseHistory || [];
  const totalPurchases = purchases.length;
  const totalSpent = purchases.reduce((sum, p) => sum + (p.total || 0), 0);

  const ratingTrend = deliveries.slice(-10).map((d) => ({
    date: d.date,
    onTime: d.onTime,
    delayMinutes: d.delayMinutes,
  }));

  return {
    supplierId: id,
    name: supplier.name,
    company: supplier.company,
    rating: supplier.rating,
    onTimeDeliveryRate: totalDeliveries > 0 ? Number(((onTimeDeliveries / totalDeliveries) * 100).toFixed(1)) : 0,
    avgDelayMinutes: avgDelay,
    totalDeliveries,
    totalPurchases,
    totalSpent,
    outstandingBalance: supplier.outstandingBalance,
    ratingTrend,
  };
};

export const getSupplierAnalytics = async () => {
  const suppliers = await Supplier.find().lean();

  const topByPurchases = [...suppliers]
    .sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0))
    .slice(0, 10)
    .map((s) => ({ id: s._id, name: s.name, company: s.company, totalPurchases: s.totalPurchases }));

  const topByReliability = [...suppliers]
    .filter((s) => (s.deliveryHistory || []).length > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10)
    .map((s) => ({ id: s._id, name: s.name, company: s.company, rating: s.rating, deliveries: (s.deliveryHistory || []).length }));

  const statusDistribution = {};
  for (const s of suppliers) {
    const st = s.status || "active";
    statusDistribution[st] = (statusDistribution[st] || 0) + 1;
  }

  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);
  const averageRating = suppliers.length > 0
    ? Number((suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1))
    : 0;

  return {
    totalSuppliers: suppliers.length,
    averageRating,
    totalOutstanding,
    topByPurchases,
    topByReliability,
    statusDistribution,
    activeSuppliers: suppliers.filter((s) => s.status === "active").length,
    inactiveSuppliers: suppliers.filter((s) => s.status === "inactive").length,
    blacklistedSuppliers: suppliers.filter((s) => s.status === "blacklisted").length,
  };
};
