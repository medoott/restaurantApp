import Order from "../../../DB/model/Order.model.js";
import Product from "../../../DB/model/Product.model.js";
import Table from "../../../DB/model/Table.model.js";
import CustomerProfile from "../../../DB/model/CustomerProfile.model.js";
import Supplier from "../../../DB/model/Supplier.model.js";
import InventoryItem from "../../../DB/model/InventoryItem.model.js";
import Reservation from "../../../DB/model/Reservation.model.js";
import User from "../../../DB/model/User.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

export const globalSearch = async (query, limit = 5) => {
  if (!query || !String(query).trim()) {
    throw new AppError("Search query is required.", 400);
  }

  const search = String(query).trim();
  const maxResults = Math.min(Math.max(Number(limit) || 5, 1), 20);

  const regex = new RegExp(escapeRegExp(search), "i");
  const searchNumber = Number(search);
  const isNumeric = Number.isFinite(searchNumber);

  const [
    orders,
    products,
    tables,
    customers,
    suppliers,
    inventory,
    reservations,
    employees,
  ] = await Promise.all([
    searchOrders(search, regex, searchNumber, isNumeric, maxResults),
    searchProducts(search, regex, maxResults),
    searchTables(search, searchNumber, isNumeric, maxResults),
    searchCustomers(search, regex, maxResults),
    searchSuppliers(search, regex, maxResults),
    searchInventory(search, regex, maxResults),
    searchReservations(search, regex, searchNumber, isNumeric, maxResults),
    searchEmployees(search, regex, maxResults),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o._id,
      label: `Order #${o.code || o.id}`,
      sublabel: `${o.customer || "No customer"} - $${(o.total || 0).toFixed(2)}`,
      type: "order",
      url: `/orders/${o._id}`,
    })),
    products: products.map((p) => ({
      id: p._id,
      label: p.name,
      sublabel: `${p.category} - $${(p.price || 0).toFixed(2)}`,
      type: "product",
      url: `/menu/products/${p._id}`,
    })),
    tables: tables.map((t) => ({
      id: t._id,
      label: `Table ${t.tableNumber}`,
      sublabel: `Capacity: ${t.capacity} - ${t.section || "No section"}`,
      type: "table",
      url: `/tables/${t._id}`,
    })),
    customers: customers.map((c) => ({
      id: c._id,
      label: c.name,
      sublabel: `${c.phone || "No phone"}${c.isVIP ? " - VIP" : ""}`,
      type: "customer",
      url: `/customers/${c._id}`,
    })),
    suppliers: suppliers.map((s) => ({
      id: s._id,
      label: s.name,
      sublabel: s.company ? `${s.company} ${s.phone ? `- ${s.phone}` : ""}` : s.phone || "No contact",
      type: "supplier",
      url: `/suppliers/${s._id}`,
    })),
    inventory: inventory.map((i) => ({
      id: i._id,
      label: i.name,
      sublabel: `Stock: ${i.currentStock} ${i.unit} - ${i.category}`,
      type: "inventory",
      url: `/inventory/${i._id}`,
    })),
    reservations: reservations.map((r) => ({
      id: r._id,
      label: `Reservation for ${r.customerName}`,
      sublabel: `${r.phoneNumber || "No phone"} - ${new Date(r.reservationDate).toLocaleDateString()} ${r.reservationTime}`,
      type: "reservation",
      url: `/reservations/${r._id}`,
    })),
    employees: employees.map((e) => ({
      id: e._id,
      label: e.name,
      sublabel: `${e.role || "No role"} - ${e.email}`,
      type: "employee",
      url: `/employees/${e._id}`,
    })),
  };
};

const searchOrders = async (search, regex, searchNumber, isNumeric, limit) => {
  const filter = {
    $or: [
      { id: regex },
      { customer: regex },
      ...(isNumeric ? [{ code: searchNumber }] : []),
    ],
  };
  return Order.find(filter).sort({ createdAt: -1 }).limit(limit).select("code id customer total").lean();
};

const searchProducts = async (search, regex, limit) => {
  return Product.find({ name: regex })
    .sort({ name: 1 })
    .limit(limit)
    .select("name category price")
    .lean();
};

const searchTables = async (search, searchNumber, isNumeric, limit) => {
  if (isNumeric) {
    return Table.find({ tableNumber: searchNumber })
      .limit(limit)
      .select("tableNumber capacity section status")
      .lean();
  }
  return [];
};

const searchCustomers = async (search, regex, limit) => {
  return CustomerProfile.find({
    $or: [{ name: regex }, { phone: regex }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .select("name phone isVIP")
    .lean();
};

const searchSuppliers = async (search, regex, limit) => {
  return Supplier.find({
    $or: [{ name: regex }, { company: regex }, { phone: regex }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .select("name company phone")
    .lean();
};

const searchInventory = async (search, regex, limit) => {
  return InventoryItem.find({ name: regex })
    .sort({ name: 1 })
    .limit(limit)
    .select("name currentStock unit category")
    .lean();
};

const searchReservations = async (search, regex, searchNumber, isNumeric, limit) => {
  const filter = {
    $or: [
      { customerName: regex },
      { phoneNumber: regex },
      ...(isNumeric ? [{ tableNumber: searchNumber }] : []),
    ],
  };
  return Reservation.find(filter)
    .sort({ reservationDate: -1 })
    .limit(limit)
    .select("customerName phoneNumber reservationDate reservationTime")
    .lean();
};

const searchEmployees = async (search, regex, limit) => {
  return User.find({
    $or: [{ name: regex }, { email: regex }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .select("name email role")
    .lean();
};
