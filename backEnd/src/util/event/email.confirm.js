import { EventEmitter } from "node:events";
import { confirmEmailTemplate } from "../email/template/confirm.email.js";
import { sendEmail } from "../email/confirmEmail.js";
import { generateToken } from "../security/token.js";

export const emailEvent = new EventEmitter();

emailEvent.on("sendConfirmEmail", async ({ email }) => {
  try {
    const emailToken = generateToken({
      payload: { email },
      signature: process.env.EMAIL_TOKEN_SIGNATURE || process.env.TOKEN_SIGNATURE,
      options: { expiresIn: "1h" },
    });
    const frontEndUrl = process.env.FRONT_END_URL || "http://localhost:5173";
    const emailLink = `${frontEndUrl}/confirm-email/${emailToken}`;
    const html = confirmEmailTemplate({ link: emailLink });
    await sendEmail({ to: email, subject: "Confirm your email", html });
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
  }
});
