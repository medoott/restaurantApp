import mongoose, { Schema, model } from "mongoose";

const generalSchema = new Schema({
  name: { type: String, default: "" },
  description: { type: String, default: "" },
  phones: { type: String, default: "" },
  email: { type: String, default: "" },
  address: { type: String, default: "" },
  workingHours: { type: Schema.Types.Mixed, default: [] },
  currency: { type: String, default: "USD" },
  taxRate: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  timezone: { type: String, default: "UTC" },
  language: { type: String, default: "en" },
}, { _id: false, strict: true });

const securitySchema = new Schema({
  autoLogoutTimer: { type: Number, default: 30 },
  sessionTimeout: { type: Number, default: 1440 },
  passwordMinLength: { type: Number, default: 8 },
  requireUppercase: { type: Boolean, default: true },
  requireSpecialChar: { type: Boolean, default: true },
  twoFactorAuth: { type: Boolean, default: false },
  ipWhitelist: { type: [String], default: [] },
}, { _id: false, strict: true });

const appearanceSchema = new Schema({
  primaryColor: { type: String, default: "#3B2515" },
  secondaryColor: { type: String, default: "#EDE1CF" },
  accentColor: { type: String, default: "#B07B4F" },
  fontFamily: { type: String, default: "Poppins" },
  headingFont: { type: String, default: "Playfair Display" },
  logo: { type: String, default: "" },
  favicon: { type: String, default: "" },
  darkMode: { type: Boolean, default: false },
  animations: { type: Boolean, default: true },
}, { _id: false, strict: true });

const orderingSchema = new Schema({
  orderPrefix: { type: String, default: "ORD-" },
  onlineOrderingEnabled: { type: Boolean, default: true },
  maxItemsPerOrder: { type: Number, default: 50 },
  editWindowSeconds: { type: Number, default: 45 },
  requireCustomerName: { type: Boolean, default: false },
  guestCheckout: { type: Boolean, default: true },
  minimumOrderAmount: { type: Number, default: 0 },
  autoAcceptOrders: { type: Boolean, default: false },
}, { _id: false, strict: true });

const paymentSchema = new Schema({
  cashEnabled: { type: Boolean, default: true },
  cardEnabled: { type: Boolean, default: true },
  onlineEnabled: { type: Boolean, default: false },
  splitBillEnabled: { type: Boolean, default: true },
  tipsEnabled: { type: Boolean, default: true },
  defaultPaymentMethod: { type: String, default: "Cash" },
  stripePublicKey: { type: String, default: "" },
  stripeSecretKey: { type: String, default: "" },
}, { _id: false, strict: true });

const notificationSchema = new Schema({
  soundEnabled: { type: Boolean, default: true },
  sound: { type: String, default: "ding" },
  volume: { type: Number, default: 0.7 },
  channels: { type: [Schema.Types.Mixed], default: [] },
  events: { type: [Schema.Types.Mixed], default: [] },
  emailNotifications: { type: Boolean, default: false },
  smsNotifications: { type: Boolean, default: false },
}, { _id: false, strict: true });

const systemSchema = new Schema({
  maintenanceMode: { type: Boolean, default: false },
  debugMode: { type: Boolean, default: false },
  logLevel: { type: String, default: "info" },
  autoBackup: { type: Boolean, default: false },
  backupIntervalHours: { type: Number, default: 24 },
  retentionDays: { type: Number, default: 90 },
}, { _id: false, strict: true });

const settingsDataSchema = new Schema({
  general: { type: generalSchema, default: () => ({}) },
  security: { type: securitySchema, default: () => ({}) },
  appearance: { type: appearanceSchema, default: () => ({}) },
  ordering: { type: orderingSchema, default: () => ({}) },
  payment: { type: paymentSchema, default: () => ({}) },
  notifications: { type: notificationSchema, default: () => ({}) },
  system: { type: systemSchema, default: () => ({}) },
  staff: { type: Schema.Types.Mixed, default: {} },
  api: { type: Schema.Types.Mixed, default: {} },
  integrations: { type: Schema.Types.Mixed, default: {} },
}, { _id: false, strict: false });

const settingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "main" },
    data: { type: settingsDataSchema, default: () => ({}) },
  },
  { timestamps: true, strict: true },
);

const Settings = mongoose.models.Settings || model("Settings", settingsSchema);

export default Settings;
