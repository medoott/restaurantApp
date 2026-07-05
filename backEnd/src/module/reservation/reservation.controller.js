import * as reservationService from "./service/reservation.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import { AppError } from "../../util/error/AppError.js";

export const listReservations = asyncHandler(async (req, res) => {
  const result = await reservationService.listReservations(req.query);
  res.json({ message: "Done", data: result });
});

export const getReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.getReservationById(req.params.id);
  successResponse({ res, data: reservation, status: 200 });
});

export const createReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: reservation, status: 201 });
});

export const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.updateReservation(req.params.id, req.body);
  successResponse({ res, data: reservation, status: 200 });
});

export const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.cancelReservation(req.params.id, req.body?.reason || "");
  res.json({ message: "Done", data: reservation });
});

export const rescheduleReservation = asyncHandler(async (req, res) => {
  const { reservationDate, reservationTime } = req.body;
  const reservation = await reservationService.rescheduleReservation(req.params.id, reservationDate, reservationTime);
  successResponse({ res, data: reservation, status: 200 });
});

export const assignTable = asyncHandler(async (req, res) => {
  const { tableId } = req.body;
  const reservation = await reservationService.assignTableToReservation(req.params.id, tableId);
  successResponse({ res, data: reservation, status: 200 });
});

export const checkInCustomer = asyncHandler(async (req, res) => {
  const reservation = await reservationService.checkInReservation(req.params.id);
  successResponse({ res, data: reservation, status: 200 });
});

export const seatReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.seatReservation(req.params.id);
  res.json({ message: "Done", data: reservation });
});

export const completeReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.completeReservation(req.params.id);
  res.json({ message: "Done", data: reservation });
});

export const getReservationHistory = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone) throw new AppError("Phone number is required", 400);
  const history = await reservationService.getReservationHistory(phone);
  res.json({ message: "Done", data: { items: history } });
});

export const getAvailableTables = asyncHandler(async (req, res) => {
  const { date, time, partySize } = req.query;
  const tables = await reservationService.getAvailableTables(date, time, partySize);
  res.json({ message: "Done", data: { tables } });
});

export const getTodayReservations = asyncHandler(async (req, res) => {
  const reservations = await reservationService.getTodayReservations();
  res.json({ message: "Done", data: { items: reservations } });
});

export const processNoShows = asyncHandler(async (req, res) => {
  const result = await reservationService.processNoShows(req.user?._id);
  successResponse({ res, data: result, status: 200 });
});
