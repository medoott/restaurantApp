import { Router } from "express";
import { asyncHandler } from "../../util/error/error.js";
import { developerAuthentication } from "../../middleware/auth.middleware.js";
import * as devService from "./developer.service.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const result = await devService.developerLogin({ email, password });
  res.json({ message: "Developer authenticated", data: result });
}));

router.get("/verify", developerAuthentication(), asyncHandler(async (req, res) => {
  res.json({ isDeveloper: true });
}));

router.get("/settings", developerAuthentication(), asyncHandler(async (req, res) => {
  const settings = await devService.listDeveloperSettings();
  res.json({ data: settings });
}));

router.get("/settings/:key", developerAuthentication(), asyncHandler(async (req, res) => {
  const setting = await devService.getDeveloperSetting(req.params.key);
  res.json({ data: setting });
}));

router.put("/settings/:key", developerAuthentication(), asyncHandler(async (req, res) => {
  const { value, description, category } = req.body;
  const setting = await devService.updateDeveloperSetting({
    key: req.params.key, value, description, category, userId: req.user._id,
  });
  res.json({ message: "Setting updated", data: setting });
}));

router.delete("/settings/:key", developerAuthentication(), asyncHandler(async (req, res) => {
  const result = await devService.deleteDeveloperSetting({ key: req.params.key, userId: req.user._id });
  res.json(result);
}));

router.get("/logs", developerAuthentication(), asyncHandler(async (req, res) => {
  const result = await devService.listDeveloperLogs(req.query);
  res.json(result);
}));

router.get("/logs/actions", developerAuthentication(), asyncHandler(async (req, res) => {
  const actions = await devService.getDeveloperLogActions();
  res.json({ data: actions });
}));

router.get("/system/cache", developerAuthentication(), asyncHandler(async (req, res) => {
  const info = await devService.getSystemCacheInfo();
  res.json({ data: info });
}));

router.get("/system/env", developerAuthentication(), asyncHandler(async (req, res) => {
  const env = devService.getSanitizedEnv();
  res.json({ data: env });
}));

router.get("/system/diagnostics", developerAuthentication(), asyncHandler(async (req, res) => {
  const cacheInfo = await devService.getSystemCacheInfo();
  const env = devService.getSanitizedEnv();
  res.json({ data: { ...cacheInfo, env } });
}));

export default router;
