import mongoose, { Schema, model } from "mongoose";

const RESERVATION_STATUSES = ["pending", "confirmed", "arrived", "seated", "cancelled", "no_show", "completed"];

const reservationSchema = new Schema(
  {
    reservationId: { type: String, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    partySize: { type: Number, required: true, min: 1 },
    reservationDate: { type: Date, required: true, index: true },
    reservationTime: { type: String, required: true },
    endTime: { type: String, default: "" },
    table: { type: Schema.Types.ObjectId, ref: "Table", default: null },
    tableNumber: { type: Number, default: null },
    preferredSection: { type: String, default: "" },
    notes: { type: String, default: "" },
    specialRequests: { type: String, default: "" },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: "pending",
      index: true,
    },
    branch: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    confirmedAt: { type: Date, default: null },
    seatedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: "" },
    noShowAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    gracePeriodMinutes: { type: Number, default: 15 },
  },
  { timestamps: true },
);

reservationSchema.index({ reservationDate: 1, status: 1 });
reservationSchema.index({ table: 1, reservationDate: 1, reservationTime: 1 });
reservationSchema.index({ phoneNumber: 1 });
reservationSchema.index({ branch: 1 });
reservationSchema.index({ branch: 1, reservationDate: 1, status: 1 });
reservationSchema.index({ tableNumber: 1 });
reservationSchema.index({ status: 1, reservationDate: 1 });
reservationSchema.index({ createdAt: -1 });
reservationSchema.index({ customerName: 1 });

const Reservation = mongoose.models.Reservation || model("Reservation", reservationSchema);

export { RESERVATION_STATUSES };
export default Reservation;
