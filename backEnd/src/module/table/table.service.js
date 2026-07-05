import Table, { TABLE_SECTIONS, TABLE_STATUSES } from "../../DB/model/Table.model.js";
import TableSession from "../../DB/model/TableSession.model.js";
import Order from "../../DB/model/Order.model.js";
import User from "../../DB/model/User.model.js";
import AuditLog from "../../DB/model/AuditLog.model.js";
import Visit from "../../DB/model/Visit.model.js";

export const getAllTables = async (query = {}) => {
  const filter = {};
  if (query.status && query.status !== "All") {
    filter.status = query.status;
  }
  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [
      { tableNumber: isNaN(Number(query.search)) ? undefined : Number(query.search) },
      { notes: regex },
      { branch: regex },
    ].filter(Boolean);
  }
  if (query.section) {
    filter.section = query.section;
  }

  const tables = await Table.find(filter).sort({ tableNumber: 1 }).lean();
  return tables;
};

export const getTableById = async (id) => {
  const table = await Table.findById(id).lean();
  if (!table) throw new AppError("Table not found", 404);
  return table;
};

export const getTableByNumber = async (tableNumber) => {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
  if (!table) throw new AppError("Table not found", 404);
  return table;
};

export const createTable = async (payload = {}) => {
  const { tableNumber, capacity, branch, notes, section } = payload;
  if (!tableNumber || tableNumber < 1) {
    throw new AppError("Table number is required and must be positive", 400);
  }
  const existing = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
  if (existing) {
    throw new AppError(`Table ${tableNumber} already exists`, 409);
  }
  const table = await Table.create({
    tableNumber: Number(tableNumber),
    capacity: Math.max(Number(capacity) || 4, 1),
    status: "available",
    section: TABLE_SECTIONS.includes(section) ? section : "Indoor",
    branch: String(branch || "").trim(),
    notes: String(notes || "").trim(),
  });
  return table.toObject();
};

export const updateTable = async (id, payload = {}) => {
  const updates = {};
  const allowed = ["tableNumber", "status", "capacity", "branch", "notes", "section"];
  for (const field of allowed) {
    if (payload[field] !== undefined) updates[field] = payload[field];
  }
  if (updates.tableNumber !== undefined) {
    updates.tableNumber = Number(updates.tableNumber);
    if (updates.tableNumber < 1) throw new AppError("Table number must be positive", 400);
    const dup = await Table.findOne({
      tableNumber: updates.tableNumber,
      _id: { $ne: id },
    }).lean();
    if (dup) throw new AppError(`Table ${updates.tableNumber} already exists`, 409);
  }
  if (updates.capacity !== undefined) {
    updates.capacity = Math.max(Number(updates.capacity) || 4, 1);
  }
  if (updates.status !== undefined) {
    if (!TABLE_STATUSES.includes(updates.status)) throw new AppError("Invalid status", 400);
  }
  if (updates.section !== undefined) {
    if (!TABLE_SECTIONS.includes(updates.section)) throw new AppError("Invalid section", 400);
  }
  const table = await Table.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after" }).lean();
  if (!table) throw new AppError("Table not found", 404);
  return table;
};

export const deleteTable = async (id) => {
  const table = await Table.findById(id).lean();
  if (!table) throw new AppError("Table not found", 404);

  const activeSession = await TableSession.findOne({ table: id, status: "active" }).lean();
  if (activeSession) {
    throw new AppError("Cannot delete table with an active session. Please end the session first.", 400);
  }

  await Table.findByIdAndDelete(id);
  return table;
};

export const updateTableStatus = async (tableNumber, status) => {
  if (!TABLE_STATUSES.includes(status)) throw new AppError("Invalid status", 400);
  const table = await Table.findOneAndUpdate(
    { tableNumber: Number(tableNumber) },
    { $set: { status } },
    { new: true },
  ).lean();
  return table;
};

export const mergeTables = async (mainTableId, tablesToMerge, userId = null) => {
  const mainTable = await Table.findById(mainTableId).lean();
  if (!mainTable) throw new AppError("Main table not found", 404);

  if (mainTable.mergedInto) {
    throw new AppError("Main table is itself merged into another table", 400);
  }

  const mergeIds = tablesToMerge.map((id) => id.toString ? id.toString() : id);
  const tables = await Table.find({ _id: { $in: mergeIds } }).lean();

  for (const t of tables) {
    if (t.mergedInto) {
      throw new AppError(`Table ${t.tableNumber} is already merged into another table`, 400);
    }
  }

  await Table.updateMany(
    { _id: { $in: mergeIds } },
    { $set: { mergedInto: mainTableId, status: mainTable.status === "occupied" ? "occupied" : mainTable.status } },
  );

  await Table.findByIdAndUpdate(mainTableId, {
    $set: { mergedTables: mergeIds },
  });

  const activeSession = await TableSession.findOne({ table: mainTableId, status: "active" }).lean();
  if (activeSession) {
    for (const mergedId of mergeIds) {
      await TableSession.updateMany(
        { table: mergedId, status: "active" },
        { $set: { table: mainTableId } },
      );
      await Order.updateMany(
        { tableId: mergedId.toString(), tableSession: { $ne: null } },
        { $set: { tableId: mainTableId.toString() } },
      );
    }
  }

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: mainTable.tableNumber,
      action: "merge_tables",
      description: `Merged tables [${tables.map((t) => t.tableNumber).join(", ")}] into table ${mainTable.tableNumber}`,
    });
  }

  return Table.findById(mainTableId).lean();
};

export const splitTables = async (mainTableId, userId = null) => {
  const mainTable = await Table.findById(mainTableId).lean();
  if (!mainTable) throw new AppError("Main table not found", 404);

  const mergedIds = mainTable.mergedTables || [];
  if (mergedIds.length === 0) {
    throw new AppError("Table has no merged tables to split", 400);
  }

  await Table.updateMany(
    { _id: { $in: mergedIds } },
    { $set: { mergedInto: null, status: "available" } },
  );

  await Table.findByIdAndUpdate(mainTableId, {
    $set: { mergedTables: [] },
  });

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: mainTable.tableNumber,
      action: "split_tables",
      description: `Split merged table group from table ${mainTable.tableNumber}`,
    });
  }

  return Table.findById(mainTableId).lean();
};

export const moveOrderToTable = async (orderId, targetTableNumber, userId = null) => {
  const targetTable = await Table.findOne({ tableNumber: Number(targetTableNumber) }).lean();
  if (!targetTable) throw new AppError("Target table not found", 404);

  const order = await Order.findById(orderId).lean();
  if (!order) throw new AppError("Order not found", 404);

  const previousOrder = { ...order };

  const updateFields = {
    tableNumber: Number(targetTableNumber),
    tableId: targetTable._id.toString(),
  };

  const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: updateFields }, { new: true }).lean();

  if (order.tableSession) {
    await TableSession.findByIdAndUpdate(order.tableSession, { $set: { table: targetTable._id } });
  }

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: Number(targetTableNumber),
      orderId: orderId.toString(),
      action: "move_order",
      description: `Moved order ${orderId} from table ${order.tableNumber} to table ${targetTableNumber}`,
      previousValue: { tableNumber: order.tableNumber, tableId: order.tableId },
      newValue: updateFields,
    });
  }

  return updatedOrder;
};

export const changeTableNumber = async (tableId, newNumber, userId = null) => {
  const newNum = Number(newNumber);
  if (newNum < 1) throw new AppError("Table number must be positive", 400);

  const dup = await Table.findOne({ tableNumber: newNum, _id: { $ne: tableId } }).lean();
  if (dup) throw new AppError(`Table ${newNum} already exists`, 409);

  const oldTable = await Table.findById(tableId).lean();
  if (!oldTable) throw new AppError("Table not found", 404);

  const table = await Table.findByIdAndUpdate(
    tableId,
    { $set: { tableNumber: newNum } },
    { returnDocument: "after" },
  ).lean();

  await Promise.all([
    Order.updateMany({ tableNumber: oldTable.tableNumber }, { $set: { tableNumber: newNum } }),
    TableSession.updateMany({ tableNumber: oldTable.tableNumber }, { $set: { tableNumber: newNum } }),
    User.updateMany({ assignedTables: oldTable.tableNumber }, { $set: { "assignedTables.$[elem]": newNum } }, {
      arrayFilters: [{ elem: oldTable.tableNumber }],
    }),
    Visit.updateMany({ tableNumber: oldTable.tableNumber }, { $set: { tableNumber: newNum } }),
  ]);

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: newNum,
      action: "change_table_number",
      description: `Changed table number from ${oldTable.tableNumber} to ${newNum}. Updated all related records.`,
      previousValue: { tableNumber: oldTable.tableNumber },
      newValue: { tableNumber: newNum },
    });
  }

  return table;
};

export const lockTable = async (tableId, reason, userId = null) => {
  const table = await Table.findByIdAndUpdate(
    tableId,
    { $set: { isLocked: true, status: "out_of_service", lockedReason: reason || "", lockedBy: userId } },
    { returnDocument: "after" },
  ).lean();
  if (!table) throw new AppError("Table not found", 404);

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: table.tableNumber,
      action: "lock_table",
      description: `Locked table ${table.tableNumber}: ${reason || "No reason given"}`,
    });
  }

  return table;
};

export const unlockTable = async (tableId, userId = null) => {
  const table = await Table.findByIdAndUpdate(
    tableId,
    { $set: { isLocked: false, status: "available", lockedReason: "", lockedBy: null } },
    { returnDocument: "after" },
  ).lean();
  if (!table) throw new AppError("Table not found", 404);

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: table.tableNumber,
      action: "unlock_table",
      description: `Unlocked table ${table.tableNumber}`,
    });
  }

  return table;
};

export const reopenTable = async (tableNumber, userId = null) => {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
  if (!table) throw new AppError("Table not found", 404);

  if (table.currentSession) {
    await TableSession.findByIdAndUpdate(table.currentSession, {
      $set: { status: "expired", closedAt: new Date() },
    });
  }

  const updated = await Table.findOneAndUpdate(
    { tableNumber: Number(tableNumber) },
    { $set: { status: "available", currentSession: null, isLocked: false, lockedReason: "", lockedBy: null } },
    { returnDocument: "after" },
  ).lean();

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: table.tableNumber,
      action: "reopen_table",
      description: `Reopened table ${table.tableNumber}`,
    });
  }

  return updated;
};

export const getTablesBySection = async (section) => {
  if (!TABLE_SECTIONS.includes(section)) throw new AppError("Invalid section", 400);
  return Table.find({ section }).sort({ tableNumber: 1 }).lean();
};

export const updateTableLayout = async (tableId, { x, y, shape }, userId = null) => {
  const updates = {};
  if (x !== undefined) updates.x = Number(x);
  if (y !== undefined) updates.y = Number(y);
  if (shape !== undefined) {
    if (!["circle", "rectangle", "square", "round"].includes(shape)) {
      throw new AppError("Invalid shape. Must be circle, rectangle, square, or round", 400);
    }
    updates.shape = shape;
  }

  const table = await Table.findByIdAndUpdate(tableId, { $set: updates }, { returnDocument: "after" }).lean();
  if (!table) throw new AppError("Table not found", 404);

  if (userId) {
    await AuditLog.create({
      user: userId,
      tableNumber: table.tableNumber,
      action: "update_table_layout",
      description: `Updated layout for table ${table.tableNumber}: x=${x}, y=${y}, shape=${shape}`,
    });
  }

  return table;
};

export const getTableWithDetails = async (tableId) => {
  const table = await Table.findById(tableId).lean();
  if (!table) throw new AppError("Table not found", 404);

  const currentSession = await TableSession.findOne({ table: tableId, status: "active" }).lean();
  const activeOrders = await Order.find({ tableId: tableId.toString(), status: { $nin: ["Cancelled", "Paid", "Rejected"] } }).lean();

  return {
    ...table,
    currentSession: currentSession || null,
    activeOrders,
    waiterRequests: [],
  };
};

export const getFloorLayout = async () => {
  const tables = await Table.find({})
    .select("tableNumber status capacity section x y shape isLocked mergedInto currentSession")
    .sort({ tableNumber: 1 })
    .lean();

  const groupedBySection = {};
  for (const section of TABLE_SECTIONS) {
    groupedBySection[section] = [];
  }

  const tableIds = tables.map((t) => t._id.toString());

  const activeSessions = await TableSession.find({ table: { $in: tableIds }, status: "active" })
    .select("table")
    .lean();

  const sessionTableIds = new Set(activeSessions.map((s) => s.table.toString()));

  const activeOrderCounts = {};
  const orderGroups = await Order.aggregate([
    { $match: { tableId: { $in: tableIds }, status: { $nin: ["Cancelled", "Paid", "Rejected"] } } },
    { $group: { _id: "$tableId", count: { $sum: 1 } } },
  ]);
  for (const g of orderGroups) {
    activeOrderCounts[g._id] = g.count;
  }

  for (const table of tables) {
    const section = table.section || "Indoor";
    if (!groupedBySection[section]) groupedBySection[section] = [];
    groupedBySection[section].push({
      ...table,
      hasActiveSession: sessionTableIds.has(table._id.toString()),
      activeOrderCount: activeOrderCounts[table._id.toString()] || 0,
    });
  }

  return groupedBySection;
};
