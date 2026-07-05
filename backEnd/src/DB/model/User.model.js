
import mongoose, { Schema, model } from "mongoose";
import { generateHash, compareHash } from "../../util/security/hash.js";

const USER_ROLES = [
  "User",
  "Admin",
  "Cashier",
  "Cook",
  "Order Taker",
  "General Manager",
  "Branch Manager",
  "Host",
  "Cleaner",
  "Owner",
  "Administrator",
];

const EMPLOYEE_STATUSES = ["available", "busy", "on_break", "offline", "serving", "preparing"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      minLength: 2,
      maxLength: 205,
      trim: true,
      required: [true, "Name is required"],
    },
    customerCode: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      required: [true, "Email is required"],
      unique: true,
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    confirmEmail: {
      type: Boolean,
      default: false,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    address: String,
    phone: {
      type: String,
      trim: true,
      required: [true, "Phone is required"],
    },
    image: String,
    role: {
      type: String,
      enum: USER_ROLES,
      default: "User",
    },
    employeeStatus: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: "offline",
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
      description: "Additional permissions granted beyond role defaults",
    },
    revokedPermissions: {
      type: [String],
      default: [],
      description: "Permissions revoked from role defaults",
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    skills: [{ type: String }],
    assignedTables: [{ type: Number }],
    assignedSections: [{ type: String }],
    isDeveloper: {
      type: Boolean,
      default: false,
    },
    currentTaskCount: { type: Number, default: 0, min: 0 },
    maxConcurrentTasks: { type: Number, default: 5 },
    performance: {
      ordersDelivered: { type: Number, default: 0 },
      requestsResolved: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
      totalShifts: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
    lastStatusChange: { type: Date, default: Date.now },
    shift: {
      clockedIn: { type: Boolean, default: false },
      clockedInAt: { type: Date, default: null },
      clockedOutAt: { type: Date, default: null },
      breakStartedAt: { type: Date, default: null },
      totalBreakMinutes: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

userSchema.index({ employeeStatus: 1, branchId: 1 });
userSchema.index({ branchId: 1, role: 1, employeeStatus: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await generateHash({ plainText: this.password });
});

userSchema.methods.comparePassword = async function (plainText) {
  return compareHash({ plainText, hashValue: this.password });
};

const User = mongoose.models.User || model("User", userSchema);

export { EMPLOYEE_STATUSES, USER_ROLES };
export default User;
