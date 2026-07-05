import mongoose, { Schema, model } from "mongoose";

const QUEUE_STATUSES = ["waiting", "notified", "seated", "cancelled", "no_show", "left"];
const QUEUE_PRIORITIES = ["regular", "priority", "vip"];

const waitingQueueSchema = new Schema({
  visitId: { type: Schema.Types.ObjectId, ref: "Visit", required: true, index: true },
  position: { type: Number, required: true },
  partySize: { type: Number, required: true, min: 1 },
  status: { type: String, enum: QUEUE_STATUSES, default: "waiting", index: true },

  customer: {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    profileId: { type: Schema.Types.ObjectId, ref: "CustomerProfile", default: null },
    isVIP: { type: Boolean, default: false },
    membershipLevel: { type: String, default: "bronze" },
  },

  priority: { type: String, enum: QUEUE_PRIORITIES, default: "regular" },
  estimatedWaitMinutes: { type: Number, default: 0 },
  actualWaitMinutes: { type: Number, default: 0 },

  preferences: {
    preferredSection: { type: String, default: "" },
    preferredTableSize: { type: Number, default: 0 },
    specialRequests: { type: String, default: "" },
    highChair: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
  },

  notifiedAt: { type: Date, default: null },
  notificationSent: { type: Boolean, default: false },
  notificationMethod: { type: String, enum: ["sms", "in_person", "none"], default: "in_person" },

  seatedAt: { type: Date, default: null },
  seatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  assignedTable: { type: Schema.Types.ObjectId, ref: "Table", default: null },
  assignedTableNumber: { type: Number, default: null },

  checkedInAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: "" },
  noShowAt: { type: Date, default: null },

  origin: { type: String, enum: ["walk_in", "reservation", "online", "phone"], default: "walk_in" },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  notes: { type: String, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

waitingQueueSchema.index({ status: 1, position: 1 });
waitingQueueSchema.index({ "customer.phone": 1, status: 1 });
waitingQueueSchema.index({ branchId: 1, status: 1, priority: 1, position: 1 });

waitingQueueSchema.statics.getNextPosition = async function (branchId = null) {
  const filter = { status: "waiting" };
  if (branchId) filter.branchId = branchId;
  const last = await this.findOne(filter).sort({ position: -1 }).lean();
  return last ? last.position + 1 : 1;
};

waitingQueueSchema.statics.getEstimatedWait = async function (branchId = null) {
  const now = new Date();
  const filter = {
    status: "waiting",
    checkedInAt: { $lte: now },
  };
  if (branchId) filter.branchId = branchId;

  const recentSeated = await this.find({
    status: "seated",
    checkedInAt: { $gte: new Date(now - 3600000) },
  })
    .sort({ checkedInAt: -1 })
    .limit(20)
    .lean();

  if (recentSeated.length === 0) return { averageWaitMinutes: 0, partiesAhead: 0 };

  const waitTimes = recentSeated
    .filter((r) => r.actualWaitMinutes > 0)
    .map((r) => r.actualWaitMinutes);

  const avgWait = waitTimes.length > 0
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 10;

  const partiesAhead = await this.countDocuments({ status: "waiting" });
  return { averageWaitMinutes: avgWait, partiesAhead };
};

const WaitingQueue = mongoose.models.WaitingQueue || model("WaitingQueue", waitingQueueSchema);

export { QUEUE_STATUSES, QUEUE_PRIORITIES };
export default WaitingQueue;
