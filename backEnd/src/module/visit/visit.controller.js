import * as visitService from "./service/visit.service.js";
import * as guestQueueService from "./service/guestQueue.service.js";
import { asyncHandler } from "../../util/error/error.js";

export const createWalkIn = asyncHandler(async (req, res) => {
  const visit = await visitService.createWalkInVisit(req.body);
  res.status(201).json({ message: "Walk-in created", data: visit });
});

export const createReservationVisitEndpoint = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const Reservation = (await import("../../DB/model/Reservation.model.js")).default;
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return res.status(404).json({ message: "Reservation not found" });
  const visit = await visitService.createReservationVisit(reservation);
  res.status(201).json({ message: "Reservation visit created", data: visit });
});

export const seatVisitEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.seatVisit(req.params.id, req.body);
  res.json({ message: "Visit seated", data: visit });
});

export const requestBillEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.requestBill(req.params.id);
  res.json({ message: "Bill requested", data: visit });
});

export const closeVisitEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.closeVisit(req.params.id, { closedBy: req.user?._id });
  res.json({ message: "Visit closed", data: visit });
});

export const abandonVisitEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.abandonVisit(req.params.id, { abandonedBy: req.user?._id, reason: req.body.reason });
  res.json({ message: "Visit abandoned", data: visit });
});

export const getActiveVisitByTableEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.getActiveVisitByTable(Number(req.params.tableNumber));
  if (!visit) return res.json({ message: "No active visit", data: null });
  res.json({ message: "Done", data: visit });
});

export const getActiveVisitsEndpoint = asyncHandler(async (req, res) => {
  const visits = await visitService.getActiveVisits(req.query);
  res.json({ message: "Done", data: { items: visits } });
});

export const getVisitHistoryEndpoint = asyncHandler(async (req, res) => {
  const visits = await visitService.getVisitHistory(req.query);
  res.json({ message: "Done", data: { items: visits } });
});

export const getVisitAnalyticsEndpoint = asyncHandler(async (req, res) => {
  const analytics = await visitService.getVisitAnalytics(req.query);
  res.json({ message: "Done", data: analytics });
});

export const transferVisitTableEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.transferVisitTable(req.params.id, req.body.newTableId);
  res.json({ message: "Visit transferred", data: visit });
});

export const completePaymentEndpoint = asyncHandler(async (req, res) => {
  const visit = await visitService.completePayment(req.params.id, { ...req.body, processedBy: req.user?._id });
  res.json({ message: "Payment processing", data: visit });
});

export const addToQueue = asyncHandler(async (req, res) => {
  const entry = await guestQueueService.addToQueue(req.body);
  res.status(201).json({ message: "Added to queue", data: entry });
});

export const callFromQueue = asyncHandler(async (req, res) => {
  const entry = await guestQueueService.callFromQueue(req.params.id);
  res.json({ message: "Called from queue", data: entry });
});

export const seatFromQueue = asyncHandler(async (req, res) => {
  const result = await guestQueueService.seatFromQueue(req.params.id, req.body);
  res.json({ message: "Seated from queue", data: result });
});

export const cancelFromQueue = asyncHandler(async (req, res) => {
  const entry = await guestQueueService.cancelFromQueue(req.params.id, req.body.reason);
  res.json({ message: "Cancelled from queue", data: entry });
});

export const getQueueStatusEndpoint = asyncHandler(async (req, res) => {
  const status = await guestQueueService.getQueueStatus(req.query);
  res.json({ message: "Done", data: status });
});
