import Settings from "../../DB/model/Settings.model.js";

import { AppError } from "../../util/error/AppError.js";

const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
let settingsCache = { data: null, timestamp: 0 };

const DEFAULT_SETTINGS = {
  general: {
    name: "Brúne Coffee & Kitchen",
    logo: "",
    coverImage: "",
    description: "Premium coffee & kitchen experience in the heart of the city.",
    address: "123 Gourmet Street, Downtown District, City",
    mapsLocation: "https://maps.google.com/?q=Brune+Coffee+Kitchen",
    phones: "+1 234 567 890, +1 234 567 891",
    whatsapp: "+1 234 567 890",
    email: "hello@brunecoffee.com",
    website: "https://brunecoffee.com",
    workingHours: [
      { day: "Monday", enabled: true, open: "08:00", close: "23:00" },
      { day: "Tuesday", enabled: true, open: "08:00", close: "23:00" },
      { day: "Wednesday", enabled: true, open: "08:00", close: "23:00" },
      { day: "Thursday", enabled: true, open: "08:00", close: "23:00" },
      { day: "Friday", enabled: true, open: "08:00", close: "00:00" },
      { day: "Saturday", enabled: true, open: "09:00", close: "00:00" },
      { day: "Sunday", enabled: false, open: "10:00", close: "22:00" },
    ],
    timezone: "UTC+02:00",
    language: "English",
    currency: "USD ($)",
    taxPercentage: "8",
    serviceCharge: "5",
  },
  branding: {
    logo: "",
    favicon: "",
    primaryColor: "#3B2515",
    secondaryColor: "#B07B4F",
    accentColor: "#C9925F",
    fontFamily: "Poppins",
    mode: "light",
  },
  menu: {
    enableCategories: true,
    enableProductSearch: true,
    enableProductRatings: true,
    enableProductImages: true,
    showCalories: false,
    showIngredients: true,
    markAvailable: true,
    featuredProducts: true,
    productSorting: "name-asc",
  },
  ordering: {
    enableOnlineOrdering: true,
    enableCashOrders: true,
    enableScheduledOrders: true,
    enableGuestOrders: true,
    requireCustomerName: true,
    requirePhoneNumber: true,
    minOrderAmount: "0",
    maxOrderAmount: "9999",
    maxQuantityPerItem: "99",
    autoGenerateOrderNumber: true,
    orderPrefix: "ORD-",
  },
  orderStatuses: {
    statuses: [
      { name: "Pending", color: "bg-amber-100 text-amber-700 ring-amber-300" },
      { name: "Confirmed", color: "bg-sky-100 text-sky-700 ring-sky-300" },
      { name: "Preparing", color: "bg-orange-100 text-orange-700 ring-orange-300" },
      { name: "Ready", color: "bg-emerald-100 text-emerald-700 ring-emerald-300" },
      { name: "Served", color: "bg-indigo-100 text-indigo-700 ring-indigo-300" },
      { name: "Delivered", color: "bg-stone-100 text-stone-600 ring-stone-300" },
      { name: "Cancelled", color: "bg-rose-100 text-rose-700 ring-rose-300" },
    ],
  },
  payment: {
    methods: [
      { key: "cash", enabled: true },
      { key: "creditCard", enabled: true },
      { key: "debitCard", enabled: false },
      { key: "applePay", enabled: true },
      { key: "googlePay", enabled: true },
      { key: "stripe", enabled: true },
      { key: "paypal", enabled: false },
      { key: "fawry", enabled: false },
      { key: "vodafoneCash", enabled: false },
    ],
  },
  notifications: {
    events: [
      { key: "newOrder", enabled: true },
      { key: "cancelledOrder", enabled: true },
      { key: "paymentReceived", enabled: true },
      { key: "readyOrder", enabled: true },
      { key: "dailyReport", enabled: false },
      { key: "weeklyReport", enabled: false },
      { key: "monthlyReport", enabled: false },
    ],
    channels: [
      { key: "browser", enabled: true },
      { key: "email", enabled: true },
      { key: "sms", enabled: false },
      { key: "whatsapp", enabled: false },
      { key: "telegram", enabled: false },
    ],
    soundEnabled: true,
    volume: 75,
    sound: "chime",
  },
  staff: {
    roles: [],
    users: [],
    auditLogs: [],
  },
  security: {
    twoFactorEnabled: false,
    autoLogoutTimer: "30",
    passwordPolicy: "high",
  },
  backup: {
    dailyBackup: true,
    weeklyBackup: false,
    monthlyBackup: true,
  },
  reports: {
    dailyReports: true,
    weeklyReports: true,
    monthlyReports: true,
    yearlyReports: false,
    pdf: true,
    excel: true,
    csv: false,
  },
  customer: {
    codeFormat: "CUST-{NUMBER}",
    loyaltyPoints: true,
    rewards: true,
    birthdayRewards: false,
    referralRewards: false,
    customerNotes: true,
    pointsPerDollar: "10",
  },
  inventory: {
    lowStockAlert: true,
    automaticStockUpdate: true,
    ingredientTracking: true,
    purchaseAlerts: false,
    stockThreshold: "20",
  },
  integrations: {
    integrations: [
      { key: "stripe", enabled: true, fields: [{ key: "publishableKey", value: "" }, { key: "secretKey", value: "" }] },
      { key: "paypal", enabled: false, fields: [{ key: "clientId", value: "" }, { key: "clientSecret", value: "" }] },
      { key: "googleMaps", enabled: true, fields: [{ key: "apiKey", value: "" }] },
      { key: "cloudinary", enabled: true, fields: [{ key: "cloudName", value: "" }, { key: "apiKey", value: "" }, { key: "apiSecret", value: "" }] },
      { key: "firebase", enabled: false, fields: [{ key: "projectId", value: "" }, { key: "apiKey", value: "" }] },
      { key: "smtp", enabled: true, fields: [{ key: "host", value: "" }, { key: "port", value: "587" }, { key: "username", value: "" }, { key: "password", value: "" }] },
      { key: "smsGateway", enabled: false, fields: [{ key: "provider", value: "" }, { key: "apiKey", value: "" }] },
      { key: "whatsapp", enabled: false, fields: [{ key: "phoneNumberId", value: "" }, { key: "accessToken", value: "" }] },
    ],
  },
  api: {
    apiKey: "",
    webhookUrl: "",
    corsOrigins: "",
    rateLimit: "300",
  },
  appearance: {
    sidebarStyle: "default",
    dashboardLayout: "grid",
    tableDensity: "comfortable",
    cardStyle: "elevated",
    animations: true,
    dashboardWidgets: ["Revenue Chart", "Orders Overview", "Top Products", "Recent Orders"],
    bannerUrl: "",
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
  },
};

export const getSettings = async () => {
  const now = Date.now();
  if (settingsCache.data && now - settingsCache.timestamp < SETTINGS_CACHE_TTL_MS) {
    return settingsCache.data;
  }

  let doc = await Settings.findOne({ key: "main" }).lean();
  if (!doc) {
    doc = await Settings.create({ key: "main", data: DEFAULT_SETTINGS });
    doc = doc.toObject();
  }

  settingsCache = { data: doc.data, timestamp: now };
  return doc.data;
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export const updateSettings = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid settings data", 400);
  }

  const existing = await getSettings();
  const merged = deepMerge(existing, payload);

  const doc = await Settings.findOneAndUpdate(
    { key: "main" },
    { $set: { data: merged } },
    { new: true, upsert: true, runValidators: false },
  ).lean();

  settingsCache = { data: doc.data, timestamp: Date.now() };
  return doc.data;
};
