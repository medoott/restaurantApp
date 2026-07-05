import { randomUUID } from "node:crypto";
import Table from "../../DB/model/Table.model.js";
import TableSession from "../../DB/model/TableSession.model.js";
import Order from "../../DB/model/Order.model.js";
import { AppError } from "../../util/error/AppError.js";
import AuditLog from "../../DB/model/AuditLog.model.js";

const SESSION_DURATION_MS = 45 * 60 * 1000;

import crypto from "node:crypto";

function generateSessionToken(tableId) {
  const raw = `${tableId}:${Date.now()}:${randomUUID()}`;
  const signature = crypto
    .createHmac("sha256", process.env.TABLE_SESSION_SECRET || process.env.TOKEN_SIGNATURE)
    .update(raw)
    .digest("hex");
  return Buffer.from(`${raw}:${signature}`).toString("base64").replace(/=+$/, "");
}

function verifySessionTokenIntegrity(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return false;
    const signature = decoded.slice(lastColon + 1);
    const raw = decoded.slice(0, lastColon);
    const expected = crypto
      .createHmac("sha256", process.env.TABLE_SESSION_SECRET || process.env.TOKEN_SIGNATURE)
      .update(raw)
      .digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

export async function createTableSession(tableNumber, options = {}) {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
  if (!table) throw new AppError("Table not found", 404);
  if (table.status === "maintenance") {
    throw new AppError("This table is currently unavailable. Please ask a staff member for assistance.", 400);
  }

  const now = new Date();

  const refreshed = await TableSession.findOneAndUpdate(
    {
      table: table._id,
      status: "active",
      expiresAt: { $gt: now },
      ...(options.ip ? { ip: options.ip } : {}),
    },
    {
      $set: { lastActivityAt: now, expiresAt: new Date(now.getTime() + SESSION_DURATION_MS) },
      $setOnInsert: { ip: options.ip || "", userAgent: options.userAgent || "" },
    },
    { new: true },
  ).lean();

  if (refreshed) {
    await Table.findByIdAndUpdate(table._id, { $set: { status: "occupied", currentSession: refreshed._id } });
    return refreshed;
  }

  await TableSession.updateMany(
    { table: table._id, status: "active" },
    { $set: { status: "expired", closedAt: now } },
  ).lean();

  const sessionToken = generateSessionToken(table._id);
  const session = await TableSession.create({
    table: table._id,
    sessionToken,
    status: "active",
    startedAt: now,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    customerName: options.customerName || "",
    customerPhone: options.customerPhone || "",
    ip: options.ip || "",
    userAgent: options.userAgent || "",
  });

  await Table.findByIdAndUpdate(table._id, {
    $set: { status: "occupied", currentSession: session._id },
  });

  await AuditLog.create({
    action: "table_session_created",
    tableNumber: table.tableNumber,
    tableSession: session._id,
    description: `Session created for table ${table.tableNumber}`,
    ip: options.ip || "",
    sessionId: sessionToken,
    userAgent: options.userAgent || "",
  });

  return session.toObject();
}

export async function verifyTableSession(sessionToken) {
  if (!sessionToken) throw new AppError("No table session provided. Please scan the QR code again.", 401);
  const session = await TableSession.findOne({ sessionToken }).populate("table").lean();
  if (!session) throw new AppError("Invalid table session. Please scan the QR code again.", 401);
  if (session.status !== "active") {
    throw new AppError(
      session.status === "expired"
        ? "Your table session has expired. Please scan the QR code again."
        : "This table session has been closed.",
      401,
    );
  }
  if (session.expiresAt <= new Date()) {
    await TableSession.findByIdAndUpdate(session._id, { $set: { status: "expired" } });
    throw new AppError("Your table session has expired. Please scan the QR code again.", 401);
  }
  return session;
}

export async function touchTableSession(sessionToken) {
  if (!sessionToken) return null;
  const session = await TableSession.findOneAndUpdate(
    { sessionToken, status: "active" },
    { $set: { lastActivityAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DURATION_MS) } },
    { new: true },
  ).lean();
  return session;
}

export async function closeTableSession(sessionToken, options = {}) {
  const session = await TableSession.findOne({ sessionToken }).lean();
  if (!session) throw new AppError("Session not found", 404);

  const hasUnpaidOrders = await Order.findOne({
    tableSession: session._id,
    paymentStatus: { $in: ["unpaid", "partially_paid"] },
    status: { $nin: ["Cancelled", "Rejected"] },
  }).lean();

  if (hasUnpaidOrders) {
    throw new AppError("Cannot close table until all orders are paid. Please ask a staff member for assistance.", 400);
  }

  await TableSession.findByIdAndUpdate(session._id, {
    $set: {
      status: "closed",
      closedBy: options.closedBy || null,
      closedAt: new Date(),
    },
  });

  const table = await Table.findById(session.table).lean();
  if (table) {
    await Table.findByIdAndUpdate(table._id, {
      $set: { status: "available", currentSession: null },
    });
  }

  await AuditLog.create({
    user: options.closedBy || undefined,
    action: "table_session_closed",
    tableNumber: table?.tableNumber || null,
    tableSession: session._id,
    description: `Session closed for table ${table?.tableNumber || "unknown"}`,
    ip: options.ip || "",
    sessionId: sessionToken,
    userAgent: options.userAgent || "",
  });

  return { message: "Table session closed" };
}

export async function getActiveSessionForTable(tableNumber) {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
  if (!table) throw new AppError("Table not found", 404);
  if (!table.currentSession) return null;
  const session = await TableSession.findById(table.currentSession).lean();
  if (!session || session.status !== "active" || session.expiresAt <= new Date()) return null;
  return session;
}
