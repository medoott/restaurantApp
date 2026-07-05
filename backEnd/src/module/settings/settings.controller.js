import { asyncHandler } from "../../util/error/error.js";
import { AppError } from "../../util/error/AppError.js";
import {
  getSettings as getSettingsService,
  updateSettings as updateSettingsService,
} from "./settings.service.js";
import Product from "../../DB/model/Product.model.js";
import Order from "../../DB/model/Order.model.js";
import Table from "../../DB/model/Table.model.js";
import TableSession from "../../DB/model/TableSession.model.js";
import AuditLog from "../../DB/model/AuditLog.model.js";
import Shortage from "../../DB/model/Shortage.model.js";
import mongoose from "mongoose";

export const getSettings = asyncHandler(async (_req, res) => {
  const data = await getSettingsService();
  res.json({ data });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = await updateSettingsService(req.body);
  res.json({ data, message: "Settings saved successfully" });
});

export const downloadBackup = asyncHandler(async (_req, res) => {
  const settings = await getSettingsService();
  const products = await Product.find({});
  const orders = await Order.find({});
  const tables = await Table.find({});
  const tableSessions = await TableSession.find({});
  const auditLogs = await AuditLog.find({});
  const shortages = await Shortage.find({});

  const backupData = {
    settings,
    products,
    orders,
    tables,
    tableSessions,
    auditLogs,
    shortages,
    exportedAt: new Date().toISOString(),
  };

  res.json(backupData);
});

export const restoreBackup = asyncHandler(async (req, res) => {
  const backup = req.body;
  if (!backup || typeof backup !== "object") {
    throw new AppError("Invalid backup data", 400);
  }

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    // Restore settings
    if (backup.settings) {
      await updateSettingsService(backup.settings);
    }

    // Validate and restore products
    if (Array.isArray(backup.products)) {
      for (const doc of backup.products) {
        const validation = new Product(doc);
        const err = validation.validateSync();
        if (err) throw new AppError(`Invalid product data: ${err.message}`, 400);
      }
      await Product.deleteMany({}, { session });
      if (backup.products.length > 0) {
        await Product.insertMany(backup.products, { session });
      }
    }

    // Validate and restore orders
    if (Array.isArray(backup.orders)) {
      for (const doc of backup.orders) {
        const validation = new Order(doc);
        const err = validation.validateSync();
        if (err) throw new AppError(`Invalid order data: ${err.message}`, 400);
      }
      await Order.deleteMany({}, { session });
      if (backup.orders.length > 0) {
        await Order.insertMany(backup.orders, { session });
      }
    }

    // Validate and restore tables
    if (Array.isArray(backup.tables)) {
      for (const doc of backup.tables) {
        const validation = new Table(doc);
        const err = validation.validateSync();
        if (err) throw new AppError(`Invalid table data: ${err.message}`, 400);
      }
      await Table.deleteMany({}, { session });
      if (backup.tables.length > 0) {
        await Table.insertMany(backup.tables, { session });
      }
    }

    // Validate and restore tableSessions
    if (Array.isArray(backup.tableSessions)) {
      for (const doc of backup.tableSessions) {
        const validation = new TableSession(doc);
        const err = validation.validateSync();
        if (err) throw new AppError(`Invalid table session data: ${err.message}`, 400);
      }
      await TableSession.deleteMany({}, { session });
      if (backup.tableSessions.length > 0) {
        await TableSession.insertMany(backup.tableSessions, { session });
      }
    }

    // Validate and restore shortages
    if (Array.isArray(backup.shortages)) {
      for (const doc of backup.shortages) {
        const validation = new Shortage(doc);
        const err = validation.validateSync();
        if (err) throw new AppError(`Invalid shortage data: ${err.message}`, 400);
      }
      await Shortage.deleteMany({}, { session });
      if (backup.shortages.length > 0) {
        await Shortage.insertMany(backup.shortages, { session });
      }
    }

    // Log audit activity
    await AuditLog.create([{
      user: req.user?._id || null,
      action: "Restore Backup",
      description: "Restored system data from backup",
      ip: req.ip || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "unknown",
    }], { session });

    await session.commitTransaction();
    res.json({ message: "System data restored successfully!" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Backup restore failed, all changes rolled back:", error.message);
    throw error;
  } finally {
    await session.endSession();
  }
});
