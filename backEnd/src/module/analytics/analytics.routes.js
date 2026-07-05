import { Router } from "express";
import {
  getAnalytics,
  getDashboardMetrics,
  getShortageReport,
} from "./analytics.controller.js";

const router = Router();

router.get("/", getAnalytics);
router.get("/metrics", getDashboardMetrics);
router.get("/shortages", getShortageReport);

export default router;
