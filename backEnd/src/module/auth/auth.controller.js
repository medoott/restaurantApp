import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { noCache } from "../../middleware/noCache.middleware.js";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from "./validation/auth.validation.js";
import { confirmEmail, login, logout, signup } from "./service/registration.service.js";
import { authentication } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import { requestPasswordReset, resetPassword } from "./service/passwordReset.service.js";

const router = Router();

router.post("/signup", noCache, validate(signupSchema), signup);
router.patch("/confirm-email", noCache, confirmEmail);
router.post("/login", noCache, validate(loginSchema), login);
router.post("/logout", noCache, authentication(), logout);
router.post("/forgot-password", noCache, validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const data = await requestPasswordReset(req.body.email);
  successResponse({ res, message: data.message, data: { devUrl: process.env.NODE_ENV !== "production" ? data.resetUrl : undefined } });
}));
router.post("/reset-password", noCache, validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const data = await resetPassword(req.body.email, req.body.token, req.body.password);
  successResponse({ res, message: data.message });
}));

export default router;
