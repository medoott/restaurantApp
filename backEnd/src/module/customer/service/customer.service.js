import CustomerProfile, { MEMBERSHIP_LEVELS } from "../../../DB/model/CustomerProfile.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

const generateCustomerCode = () => {
  const prefix = "CUST";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

export const listCustomers = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const search = String(query.search || "").trim();
  const membership = String(query.membership || "").trim();
  const isVIP = query.isVIP !== undefined ? query.isVIP : undefined;

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: regex },
      { phone: regex },
      { customerCode: regex },
    ];
  }
  if (membership && MEMBERSHIP_LEVELS.includes(membership)) {
    filter.membershipLevel = membership;
  }
  if (isVIP !== undefined) {
    filter.isVIP = isVIP === "true" || isVIP === true;
  }

  const [items, total] = await Promise.all([
    CustomerProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CustomerProfile.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getCustomerById = async (id) => {
  const customer = await CustomerProfile.findById(id).lean();
  if (!customer) throw new AppError("Customer not found.", 404);
  return customer;
};

export const getCustomerByPhone = async (phone) => {
  if (!phone || !String(phone).trim()) throw new AppError("Phone number is required.", 400);
  const customer = await CustomerProfile.findOne({ phone: String(phone).trim() }).lean();
  if (!customer) throw new AppError("Customer not found with this phone number.", 404);
  return customer;
};

export const createCustomer = async (payload = {}) => {
  const { name, phone, email, notes } = payload;

  if (!name || !String(name).trim()) throw new AppError("Customer name is required.", 400);
  if (!phone || !String(phone).trim()) throw new AppError("Phone number is required.", 400);

  const existing = await CustomerProfile.findOne({ phone: String(phone).trim() }).lean();
  if (existing) throw new AppError("A customer with this phone number already exists.", 409);

  const customer = await CustomerProfile.create({
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email || "").trim(),
    customerCode: generateCustomerCode(),
    notes: String(notes || "").trim(),
    firstVisitDate: new Date(),
  });

  return customer;
};

export const updateCustomer = async (id, payload = {}) => {
  const customer = await CustomerProfile.findById(id);
  if (!customer) throw new AppError("Customer not found.", 404);

  const allowed = ["name", "phone", "email", "notes", "isVIP", "membershipLevel", "tags", "preferences"];
  for (const field of allowed) {
    if (payload[field] !== undefined) {
      if (field === "phone") {
        const trimmed = String(payload[field]).trim();
        if (!trimmed) throw new AppError("Phone number cannot be empty.", 400);
        const dup = await CustomerProfile.findOne({ phone: trimmed, _id: { $ne: id } }).lean();
        if (dup) throw new AppError("Another customer with this phone number already exists.", 409);
        customer[field] = trimmed;
      } else if (field === "isVIP") {
        customer[field] = Boolean(payload[field]);
      } else if (field === "membershipLevel") {
        if (!MEMBERSHIP_LEVELS.includes(payload[field])) throw new AppError("Invalid membership level.", 400);
        customer[field] = payload[field];
      } else {
        customer[field] = payload[field];
      }
    }
  }

  await customer.save();
  return customer;
};

export const deleteCustomer = async (id) => {
  const customer = await CustomerProfile.findByIdAndDelete(id).lean();
  if (!customer) throw new AppError("Customer not found.", 404);
  return { message: "Customer deleted." };
};

export const addStaffNote = async (customerId, text, userId) => {
  if (!text || !String(text).trim()) throw new AppError("Note text is required.", 400);

  const customer = await CustomerProfile.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  customer.staffNotes.push({
    text: String(text).trim(),
    createdBy: userId || null,
    createdAt: new Date(),
  });

  await customer.save();
  return customer;
};

export const recordVisit = async (customerId, visitData = {}) => {
  const customer = await CustomerProfile.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  customer.visitHistory.push({
    date: visitData.date || new Date(),
    tableNumber: Number(visitData.tableNumber) || 0,
    total: Number(visitData.total) || 0,
    orderCount: Number(visitData.orderCount) || 0,
  });

  customer.totalVisits = (customer.totalVisits || 0) + 1;
  customer.totalSpending = (customer.totalSpending || 0) + (Number(visitData.total) || 0);
  customer.lastVisitDate = new Date();

  const totalVisits = customer.totalVisits || 1;
  customer.averageOrderValue = Number((customer.totalSpending / totalVisits).toFixed(2));

  await customer.save();
  return customer;
};

export const addFavoriteProduct = async (customerId, productName, productId) => {
  const customer = await CustomerProfile.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  if (productName && !customer.favoriteProducts.includes(productName)) {
    customer.favoriteProducts.push(productName);
  }
  if (productId && !customer.favoriteProductIds.some((id) => String(id) === String(productId))) {
    customer.favoriteProductIds.push(productId);
  }

  await customer.save();
  return customer;
};

export const removeFavoriteProduct = async (customerId, productName) => {
  const customer = await CustomerProfile.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  customer.favoriteProducts = customer.favoriteProducts.filter((p) => p !== productName);

  await customer.save();
  return customer;
};

export const updateLoyaltyPoints = async (customerId, points, action = "add") => {
  const customer = await CustomerProfile.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  const pointValue = Math.abs(Number(points) || 0);

  if (action === "deduct") {
    if ((customer.loyaltyPoints || 0) < pointValue) {
      throw new AppError("Insufficient loyalty points.", 400);
    }
    customer.loyaltyPoints -= pointValue;
  } else {
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointValue;
    customer.totalPointsEarned = (customer.totalPointsEarned || 0) + pointValue;
  }

  const pointsToLevel = {
    vip: 10000,
    platinum: 5000,
    gold: 2000,
    silver: 500,
    bronze: 0,
  };

  const total = customer.totalPointsEarned || 0;
  const level = Object.entries(pointsToLevel)
    .filter(([, min]) => total >= min)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "bronze";

  customer.membershipLevel = level;
  if (level === "vip") customer.isVIP = true;

  await customer.save();
  return customer;
};

export const getCustomerAnalytics = async () => {
  const customers = await CustomerProfile.find().lean();

  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.isVIP).length;
  const totalSpendingSum = customers.reduce((s, c) => s + (c.totalSpending || 0), 0);
  const avgSpending = totalCustomers > 0 ? Number((totalSpendingSum / totalCustomers).toFixed(2)) : 0;

  const membershipDistribution = {};
  for (const c of customers) {
    const level = c.membershipLevel || "bronze";
    membershipDistribution[level] = (membershipDistribution[level] || 0) + 1;
  }

  return {
    totalCustomers,
    vipCount,
    vipPercentage: totalCustomers > 0 ? Number(((vipCount / totalCustomers) * 100).toFixed(1)) : 0,
    avgSpending,
    totalSpending: totalSpendingSum,
    avgVisits: totalCustomers > 0 ? Number((customers.reduce((s, c) => s + (c.totalVisits || 0), 0) / totalCustomers).toFixed(1)) : 0,
    membershipDistribution,
  };
};

export const getTopCustomers = async (limit = 10) => {
  const lim = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const customers = await CustomerProfile.find()
    .sort({ totalSpending: -1 })
    .limit(lim)
    .select("name phone customerCode totalSpending totalVisits membershipLevel isVIP lastVisitDate")
    .lean();

  return customers;
};

export const getCustomerSegmentation = async () => {
  const customers = await CustomerProfile.find().lean();

  const byMembership = {};
  const spendingRanges = [
    { label: "0 - 100", min: 0, max: 100 },
    { label: "100 - 500", min: 100, max: 500 },
    { label: "500 - 2000", min: 500, max: 2000 },
    { label: "2000 - 10000", min: 2000, max: 10000 },
    { label: "10000+", min: 10000, max: Infinity },
  ];
  const bySpending = spendingRanges.map((r) => ({ ...r, count: 0 }));

  const visitFrequencyRanges = [
    { label: "New (1 visit)", min: 1, max: 1 },
    { label: "Occasional (2-5)", min: 2, max: 5 },
    { label: "Regular (6-20)", min: 6, max: 20 },
    { label: "Frequent (21-50)", min: 21, max: 50 },
    { label: "VIP (50+)", min: 50, max: Infinity },
  ];
  const byVisitFrequency = visitFrequencyRanges.map((r) => ({ ...r, count: 0 }));

  for (const c of customers) {
    const level = c.membershipLevel || "bronze";
    byMembership[level] = (byMembership[level] || 0) + 1;

    const spending = c.totalSpending || 0;
    for (const r of bySpending) {
      if (spending >= r.min && spending < r.max) {
        r.count++;
        break;
      }
    }

    const visits = c.totalVisits || 0;
    for (const r of byVisitFrequency) {
      if (visits >= r.min && visits <= r.max) {
        r.count++;
        break;
      }
    }
  }

  return {
    byMembership,
    bySpending: bySpending.map((r) => ({ label: r.label, count: r.count })),
    byVisitFrequency: byVisitFrequency.map((r) => ({ label: r.label, count: r.count })),
  };
};

export const getCustomerStats = async () => {
  const customers = await CustomerProfile.find().select("createdAt totalVisits totalSpending").lean();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const acquisitionTrend = {};
  for (const c of customers) {
    const month = new Date(c.createdAt).toISOString().slice(0, 7);
    acquisitionTrend[month] = (acquisitionTrend[month] || 0) + 1;
  }

  const newLast30 = customers.filter((c) => new Date(c.createdAt) >= thirtyDaysAgo).length;
  const total = customers.length;

  const returningLast30 = customers.filter(
    (c) => (c.totalVisits || 0) > 1 && new Date(c.createdAt) < thirtyDaysAgo
  ).length;

  const retentionRate = total > 0
    ? Number(((returningLast30 / Math.max(total - newLast30, 1)) * 100).toFixed(1))
    : 0;

  return {
    totalCustomers: total,
    acquisitionTrend: Object.entries(acquisitionTrend)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    newLast30Days: newLast30,
    retentionRate,
    averageLifetimeValue: total > 0
      ? Number((customers.reduce((s, c) => s + (c.totalSpending || 0), 0) / total).toFixed(2))
      : 0,
  };
};
