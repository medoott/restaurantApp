import PurchaseOrder, { PO_STATUSES, PAYMENT_STATUSES } from "../../../DB/model/PurchaseOrder.model.js";
import Supplier from "../../../DB/model/Supplier.model.js";
import InventoryItem from "../../../DB/model/InventoryItem.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";
import { addStock } from "../../inventory/service/inventory.service.js";

const generateOrderNumber = () => {
  const prefix = "PO";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

export const listPurchaseOrders = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();
  const supplier = String(query.supplier || "").trim();

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { orderNumber: regex },
      { supplierName: regex },
    ];
  }
  if (status && PO_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (supplier) {
    filter.supplier = supplier;
  }

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate("supplier", "name company phone")
      .populate("items.inventoryItem", "name unit")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PurchaseOrder.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getPurchaseOrderById = async (id) => {
  const order = await PurchaseOrder.findById(id)
    .populate("supplier", "name company phone email")
    .populate("items.inventoryItem", "name unit category")
    .populate("createdBy", "name")
    .populate("receivedBy", "name")
    .lean();
  if (!order) throw new AppError("Purchase order not found.", 404);
  return order;
};

export const createPurchaseOrder = async (payload = {}) => {
  const { supplier, items, expectedDeliveryDate, notes, shippingAddress, createdBy } = payload;

  if (!supplier) throw new AppError("Supplier is required.", 400);
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("At least one item is required.", 400);
  }

  const supplierDoc = await Supplier.findById(supplier).lean();
  if (!supplierDoc) throw new AppError("Supplier not found.", 404);

  let subtotal = 0;
  const orderItems = items.map((item) => {
    const qty = Math.max(Number(item.quantity) || 0, 0);
    const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    return {
      inventoryItem: item.inventoryItem || null,
      itemName: String(item.itemName || "").trim(),
      quantity: qty,
      unit: String(item.unit || "pcs").trim(),
      unitPrice,
      totalPrice,
      receivedQuantity: 0,
    };
  });

  const tax = Math.max(Number(payload.tax) || 0, 0);
  const shipping = Math.max(Number(payload.shipping) || 0, 0);
  const total = subtotal + tax + shipping;

  const order = await PurchaseOrder.create({
    orderNumber: generateOrderNumber(),
    supplier,
    supplierName: supplierDoc.name,
    items: orderItems,
    subtotal,
    tax,
    shipping,
    total,
    status: "draft",
    expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
    notes: String(notes || "").trim(),
    shippingAddress: String(shippingAddress || "").trim(),
    createdBy: createdBy || null,
  });

  await recordSupplierOrder(supplier, {
    orderId: order.orderNumber,
    date: new Date(),
    total,
    status: "pending",
    itemCount: items.length,
  });

  return order;
};

const recordSupplierOrder = async (supplierId, orderData) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) return;

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
};

export const updatePurchaseOrder = async (id, payload = {}) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);

  if (!["draft", "pending"].includes(order.status)) {
    throw new AppError("Can only update draft or pending purchase orders.", 400);
  }

  const allowed = ["expectedDeliveryDate", "notes", "shippingAddress", "tax", "shipping"];
  if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
    let subtotal = 0;
    const orderItems = payload.items.map((item) => {
      const qty = Math.max(Number(item.quantity) || 0, 0);
      const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
      const totalPrice = qty * unitPrice;
      subtotal += totalPrice;
      return {
        inventoryItem: item.inventoryItem || null,
        itemName: String(item.itemName || "").trim(),
        quantity: qty,
        unit: String(item.unit || "pcs").trim(),
        unitPrice,
        totalPrice,
        receivedQuantity: item.receivedQuantity || 0,
      };
    });
    order.items = orderItems;
    order.subtotal = subtotal;
    order.total = subtotal + (order.tax || 0) + (order.shipping || 0);
  }

  for (const field of allowed) {
    if (payload[field] !== undefined) {
      if (field === "expectedDeliveryDate") {
        order[field] = payload[field] ? new Date(payload[field]) : null;
      } else {
        order[field] = payload[field];
      }
    }
  }

  await order.save();
  return order;
};

export const deletePurchaseOrder = async (id) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);
  if (!["draft", "pending"].includes(order.status)) {
    throw new AppError("Can only delete draft or pending purchase orders.", 400);
  }
  await PurchaseOrder.findByIdAndDelete(id);
  return { message: "Purchase order deleted." };
};

export const approvePurchaseOrder = async (id, userId) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);
  if (order.status !== "draft") throw new AppError("Only draft purchase orders can be approved.", 400);

  order.status = "approved";
  order.createdBy = userId || order.createdBy;
  await order.save();

  return order;
};

export const receivePurchaseOrder = async (id, receivedItems = [], userId) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);
  if (!["approved", "ordered", "partially_received"].includes(order.status)) {
    throw new AppError("Purchase order must be approved before receiving.", 400);
  }

  let allReceived = true;
  for (const item of order.items) {
    const received = receivedItems.find(
      (r) => String(r.itemId || r.inventoryItem) === String(item._id || item.inventoryItem)
    );
    if (received) {
      const qty = Math.max(Number(received.quantity) || 0, 0);
      item.receivedQuantity = Math.min((item.receivedQuantity || 0) + qty, item.quantity);

      if (item.inventoryItem && qty > 0) {
        await addStock(item.inventoryItem, {
          qty,
          note: `Received from PO ${order.orderNumber}`,
          userId,
        });
      }
    }
    if ((item.receivedQuantity || 0) < item.quantity) {
      allReceived = false;
    }
  }

  order.status = allReceived ? "received" : "partially_received";
  order.receivedDate = new Date();
  order.receivedBy = userId || order.receivedBy;

  await order.save();

  const supplier = await Supplier.findById(order.supplier);
  if (supplier) {
    const historyEntry = supplier.purchaseHistory.find(
      (h) => h.orderId === order.orderNumber
    );
    if (historyEntry) {
      historyEntry.status = order.status === "received" ? "received" : "pending";
    }
    await supplier.save();
  }

  return order;
};

export const cancelPurchaseOrder = async (id) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);
  if (["received", "cancelled"].includes(order.status)) {
    throw new AppError("Cannot cancel a received or already cancelled purchase order.", 400);
  }

  order.status = "cancelled";
  await order.save();

  const supplier = await Supplier.findById(order.supplier);
  if (supplier) {
    const historyEntry = supplier.purchaseHistory.find(
      (h) => h.orderId === order.orderNumber
    );
    if (historyEntry) {
      historyEntry.status = "cancelled";
    }
    await supplier.save();
  }

  return order;
};

export const updatePaymentStatus = async (id, status, paidAmount) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new AppError("Purchase order not found.", 404);
  if (!PAYMENT_STATUSES.includes(status)) throw new AppError("Invalid payment status.", 400);

  order.paymentStatus = status;
  if (paidAmount !== undefined) {
    order.paidAmount = Math.max(Number(paidAmount) || 0, 0);
  }
  if (status === "paid") {
    order.paidAt = new Date();
    order.paidAmount = order.total;
  }

  await order.save();
  return order;
};
