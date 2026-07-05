import mongoose, { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    customer: { type: String, default: "" },
    tableNumber: { type: Number, default: null },
    tableSession: { type: Schema.Types.ObjectId, ref: "TableSession", default: null },
    orderId: { type: String, default: null },
    module: { type: String, default: "", index: true },
    action: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    sessionId: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device: { type: String, default: "" },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ tableNumber: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || model("AuditLog", auditLogSchema);

export default AuditLog;
