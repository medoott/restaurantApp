import jwt from "jsonwebtoken";
import User from "../../DB/model/User.model.js";
import DeveloperLog from "./developer.log.model.js";
import DeveloperSetting from "./developer.setting.model.js";
import { AppError } from "../../util/error/AppError.js";
import { generateToken } from "../../util/security/token.js";

export const developerLogin = async ({ email, password }) => {
  const user = await User.findOne({ email, isDeveloper: true }).select("+password");
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = generateToken({
    payload: { id: user._id, dev: true },
    signature: process.env.TOKEN_SIGNATURE_DEVELOPER,
    expiresIn: "12h",
  });

  await logDeveloperAction({
    action: "developer.login",
    userId: user._id,
    userEmail: user.email,
    severity: "info",
    metadata: { method: "password" },
  });

  return { token, user: { id: user._id, name: user.name, email: user.email } };
};

export const verifyDeveloper = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isDeveloper) return false;
  return true;
};

export const listDeveloperSettings = async () => {
  const settings = await DeveloperSetting.find().sort({ category: 1, key: 1 }).lean();
  return settings.map((s) => ({
    ...s,
    value: s.sensitive ? "***" : s.value,
  }));
};

export const getDeveloperSetting = async (key) => {
  const setting = await DeveloperSetting.findOne({ key }).lean();
  if (!setting) throw new AppError("Setting not found", 404);
  return setting;
};

export const updateDeveloperSetting = async ({ key, value, description, category, userId }) => {
  const setting = await DeveloperSetting.findOneAndUpdate(
    { key },
    { value, description, category, lastModifiedBy: userId },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

  await logDeveloperAction({
    action: "developer.setting.update",
    userId,
    targetModel: "DeveloperSetting",
    metadata: { key, category },
    severity: "info",
  });

  return setting;
};

export const deleteDeveloperSetting = async ({ key, userId }) => {
  const setting = await DeveloperSetting.findOneAndDelete({ key });
  if (!setting) throw new AppError("Setting not found", 404);

  await logDeveloperAction({
    action: "developer.setting.delete",
    userId,
    targetModel: "DeveloperSetting",
    metadata: { key },
    severity: "warning",
  });

  return { message: "Setting deleted" };
};

export const listDeveloperLogs = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const action = String(query.action || "").trim();
  const severity = String(query.severity || "").trim();

  const filter = {};
  if (action) filter.action = action;
  if (severity) filter.severity = severity;

  const [items, total] = await Promise.all([
    DeveloperLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DeveloperLog.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
};

export const getDeveloperLogActions = async () => {
  return DeveloperLog.distinct("action");
};

export const getSystemCacheInfo = async () => {
  return {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    cpuUsage: process.cpuUsage(),
  };
};

export const getSanitizedEnv = () => {
  const safe = {};
  const allowed = [
    "NODE_ENV", "PORT", "DB_URI", "DB_NAME",
    "CORS_ORIGIN", "RATE_LIMIT_MAX_REQUESTS",
    "MAX_LOGIN_ATTEMPTS", "LOCKOUT_DURATION",
  ];
  for (const key of allowed) {
    if (process.env[key]) safe[key] = process.env[key];
  }
  return safe;
};

const logDeveloperAction = async ({ action, userId, userEmail, targetModel, targetId, previousValue, newValue, metadata, ip, userAgent, severity, duration }) => {
  try {
    await DeveloperLog.create({
      action, userId, userEmail, targetModel, targetId,
      previousValue, newValue, metadata, ip, userAgent, severity, duration,
    });
  } catch (err) {
    console.error("Failed to write developer log:", err.message);
  }
};

export { logDeveloperAction };
