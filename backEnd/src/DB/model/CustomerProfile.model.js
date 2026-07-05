import mongoose, { Schema, model } from "mongoose";

const MEMBERSHIP_LEVELS = ["bronze", "silver", "gold", "platinum", "vip"];

const customerProfileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: "", trim: true },
    customerCode: { type: String, unique: true, sparse: true, index: true },
    totalVisits: { type: Number, default: 0 },
    totalSpending: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastVisitDate: { type: Date, default: null },
    firstVisitDate: { type: Date, default: null },
    favoriteProducts: [{ type: String }],
    favoriteProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    visitHistory: [
      {
        date: { type: Date },
        tableNumber: { type: Number },
        total: { type: Number },
        orderCount: { type: Number },
      },
    ],
    orderIds: [{ type: String }],
    notes: { type: String, default: "" },
    staffNotes: [{ text: String, createdBy: { type: Schema.Types.ObjectId, ref: "User" }, createdAt: { type: Date, default: Date.now } }],
    isVIP: { type: Boolean, default: false },
    membershipLevel: { type: String, enum: MEMBERSHIP_LEVELS, default: "bronze" },
    loyaltyPoints: { type: Number, default: 0 },
    totalPointsEarned: { type: Number, default: 0 },
    tags: [{ type: String }],
    preferences: {
      favoriteCategories: [{ type: String }],
      seatingPreference: { type: String, default: "" },
      allergies: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

customerProfileSchema.index({ totalSpending: -1 });
customerProfileSchema.index({ totalVisits: -1 });
customerProfileSchema.index({ membershipLevel: 1 });
customerProfileSchema.index({ isVIP: 1 });
customerProfileSchema.index({ loyaltyPoints: -1 });
customerProfileSchema.index({ email: 1 });
customerProfileSchema.index({ lastVisitDate: -1 });
customerProfileSchema.index({ tags: 1 });
customerProfileSchema.index({ membershipLevel: 1, totalSpending: -1 });

const CustomerProfile = mongoose.models.CustomerProfile || model("CustomerProfile", customerProfileSchema);

export { MEMBERSHIP_LEVELS };
export default CustomerProfile;
