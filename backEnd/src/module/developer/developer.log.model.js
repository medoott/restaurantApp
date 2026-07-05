import mongoose, { Schema } from "mongoose";

const developerLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
    },
    targetModel: {
      type: String,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    duration: {
      type: Number,
    },
  },
  { timestamps: true },
);

developerLogSchema.index({ createdAt: -1 });
developerLogSchema.index({ severity: 1, createdAt: -1 });
developerLogSchema.index({ action: 1, createdAt: -1 });

const DeveloperLog = mongoose.models.DeveloperLog || mongoose.model("DeveloperLog", developerLogSchema);

export default DeveloperLog;
