import { getSettings } from "../module/settings/settings.service.js";

export const maintenanceMiddleware = async (req, res, next) => {
  try {
    const isExcluded = 
      req.path === "/health" ||
      req.path.startsWith("/auth/") ||
      req.path.startsWith("/settings") ||
      req.path.startsWith("/user/profile");

    if (isExcluded) {
      return next();
    }

    const settings = await getSettings();
    if (settings?.system?.maintenanceMode) {
      return res.status(503).json({
        message: "Maintenance Mode: The system is currently undergoing maintenance. Please try again later.",
        maintenance: true,
      });
    }
  } catch (err) {
    // Ignore database errors and proceed
  }
  next();
};
