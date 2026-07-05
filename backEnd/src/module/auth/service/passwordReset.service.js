import crypto from "crypto";
import userModel from "../../../DB/model/User.model.js";
import PasswordReset from "../../../DB/model/PasswordReset.model.js";
import { AppError } from "../../../util/error/AppError.js";

const RESET_TOKEN_EXPIRY_HOURS = 1;
const RESET_TOKEN_BYTES = 32;

export async function requestPasswordReset(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail) throw new AppError("Email is required", 400);

  const user = await userModel.findOne({ email: normalizedEmail }).lean();
  if (!user) return { message: "If the email exists, a reset link has been sent." };

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await PasswordReset.create({
    email: normalizedEmail,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
  });

  // In production this would send an email. For now, return the token for dev/testing.
  const resetUrl = `${process.env.FRONT_END_URL || "http://localhost:5173"}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
  console.log(`[DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`);

  return { message: "If the email exists, a reset link has been sent.", resetUrl };
}

export async function resetPassword(email, token, newPassword) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || !token || !newPassword) {
    throw new AppError("Email, token, and new password are required", 400);
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetRecord = await PasswordReset.findOne({
    email: normalizedEmail,
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) throw new AppError("User not found", 404);

  user.password = newPassword;
  await user.save();

  await PasswordReset.findOneAndUpdate(
    { _id: resetRecord._id },
    { $set: { used: true } },
  );

  return { message: "Password reset successfully" };
}
