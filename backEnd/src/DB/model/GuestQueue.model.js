import mongoose, { Schema, model } from "mongoose";

const QUEUE_SOURCES = ["walk_in", "reservation"];
const QUEUE_STATUSES = ["waiting", "called", "seated", "cancelled", "no_show"];

const guestQueueSchema = new Schema(
  {
    queueNumber: { type: Number, required: true, index: true },
    guestName: { type: String, default: "Guest" },
    guestPhone: { type: String, default: "" },
    partySize: { type: Number, default: 1 },
    status: { type: String, enum: QUEUE_STATUSES, default: "waiting", index: true },
    source: { type: String, enum: QUEUE_SOURCES, default: "walk_in" },

    requestedSection: { type: String, default: "" },
    estimatedWaitMinutes: { type: Number, default: 0 },
    actualWaitMinutes: { type: Number, default: 0 },

    reservation: { type: Schema.Types.ObjectId, ref: "Reservation", default: null },
    visit: { type: Schema.Types.ObjectId, ref: "Visit", default: null },
    seatedAtTable: { type: Schema.Types.ObjectId, ref: "Table", default: null },

    calledAt: { type: Date, default: null },
    seatedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: "" },

    notes: { type: String, default: "" },
    branch: { type: String, default: "" },
  },
  { timestamps: true },
);

guestQueueSchema.index({ status: 1, createdAt: 1 });
guestQueueSchema.index({ branch: 1, status: 1 });

const GuestQueue = mongoose.models.GuestQueue || model("GuestQueue", guestQueueSchema);

export { QUEUE_SOURCES, QUEUE_STATUSES };
export default GuestQueue;
