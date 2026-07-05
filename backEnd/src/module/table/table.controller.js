import { asyncHandler } from "../../util/error/error.js";
import { AppError } from "../../util/error/AppError.js";
import QRCode from "qrcode";
import {
  getAllTables,
  getTableById,
  getTableByNumber,
  createTable,
  updateTable,
  deleteTable,
  mergeTables as mergeTablesService,
  splitTables as splitTablesService,
  moveOrderToTable as moveOrderToTableService,
  changeTableNumber as changeTableNumberService,
  lockTable as lockTableService,
  unlockTable as unlockTableService,
  reopenTable as reopenTableService,
  getTablesBySection as getTablesBySectionService,
  updateTableLayout as updateTableLayoutService,
  getTableWithDetails as getTableWithDetailsService,
  getFloorLayout as getFloorLayoutService,
} from "./table.service.js";
import {
  createTableSession,
  verifyTableSession,
  touchTableSession,
  closeTableSession,
  getActiveSessionForTable,
} from "./table.session.service.js";

export const listTables = asyncHandler(async (req, res) => {
  const tables = await getAllTables(req.query);
  res.json({ items: tables });
});

export const getTable = asyncHandler(async (req, res) => {
  const table = await getTableById(req.params.id);
  res.json({ data: table });
});

export const getTableByNumberEndpoint = asyncHandler(async (req, res) => {
  const table = await getTableByNumber(req.params.number);
  res.json({ data: table });
});

export const addTable = asyncHandler(async (req, res) => {
  const table = await createTable(req.body);
  res.status(201).json({ data: table });
});

export const editTable = asyncHandler(async (req, res) => {
  const table = await updateTable(req.params.id, req.body);
  res.json({ data: table });
});

export const removeTable = asyncHandler(async (req, res) => {
  await deleteTable(req.params.id);
  res.json({ message: "Table deleted" });
});

export const getTableQRCode = asyncHandler(async (req, res) => {
  const table = await getTableById(req.params.id);
  const origin = process.env.FRONT_END_URL || "http://localhost:5173";
  const menuUrl = `${origin}/menu?table=${table.tableNumber}`;
  const qrDataUrl = await QRCode.toDataURL(menuUrl, {
    width: 400,
    margin: 2,
    color: { dark: "#3B2515", light: "#FFFFFF" },
  });
  res.json({ data: { url: menuUrl, qrCode: qrDataUrl } });
});

export const startSession = asyncHandler(async (req, res) => {
  const { tableNumber, customerName, customerPhone } = req.body;
  if (!tableNumber) throw new AppError("Table number is required", 400);
  const session = await createTableSession(Number(tableNumber), {
    customerName,
    customerPhone,
    ip: req.ip || "",
    userAgent: req.headers["user-agent"] || "",
  });
  res.status(201).json({ data: session });
});

export const verifySession = asyncHandler(async (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken) throw new AppError("Session token is required", 400);
  const session = await verifyTableSession(sessionToken);
  await touchTableSession(sessionToken);
  res.json({ data: session });
});

export const endSession = asyncHandler(async (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken) throw new AppError("Session token is required", 400);
  const result = await closeTableSession(sessionToken, {
    closedBy: req.user?._id,
    ip: req.ip || "",
    userAgent: req.headers["user-agent"] || "",
  });
  res.json(result);
});

export const getSessionStatus = asyncHandler(async (req, res) => {
  const { sessionToken } = req.params;
  if (!sessionToken) throw new AppError("Session token is required", 400);
  const session = await verifyTableSession(sessionToken);
  await touchTableSession(sessionToken);
  res.json({ data: session });
});

export const getTableSession = asyncHandler(async (req, res) => {
  const { tableNumber } = req.params;
  const session = await getActiveSessionForTable(Number(tableNumber));
  res.json({ data: session });
});

export const mergeTables = asyncHandler(async (req, res) => {
  const result = await mergeTablesService(req.body);
  res.json({ data: result });
});

export const splitTables = asyncHandler(async (req, res) => {
  const result = await splitTablesService(req.body);
  res.json({ data: result });
});

export const moveOrderToTable = asyncHandler(async (req, res) => {
  const result = await moveOrderToTableService(req.body);
  res.json({ data: result });
});

export const changeTableNumber = asyncHandler(async (req, res) => {
  const result = await changeTableNumberService(req.params.id, req.body);
  res.json({ data: result });
});

export const lockTable = asyncHandler(async (req, res) => {
  const result = await lockTableService(req.params.id);
  res.json({ data: result });
});

export const unlockTable = asyncHandler(async (req, res) => {
  const result = await unlockTableService(req.params.id);
  res.json({ data: result });
});

export const reopenTable = asyncHandler(async (req, res) => {
  const { tableNumber } = req.body;
  if (!tableNumber) throw new AppError("Table number is required", 400);
  const result = await reopenTableService(Number(tableNumber), req.user?._id);
  res.json({ data: result });
});

export const getTablesBySection = asyncHandler(async (req, res) => {
  const tables = await getTablesBySectionService(req.params.sectionId);
  res.json({ data: tables });
});

export const updateTableLayout = asyncHandler(async (req, res) => {
  const layout = await updateTableLayoutService(req.body);
  res.json({ data: layout });
});

export const getTableWithDetails = asyncHandler(async (req, res) => {
  const details = await getTableWithDetailsService(req.params.id);
  res.json({ data: details });
});

export const getFloorLayout = asyncHandler(async (req, res) => {
  const layout = await getFloorLayoutService();
  res.json({ data: layout });
});
