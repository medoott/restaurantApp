import crypto from "crypto";
import userModel from "../../../DB/model/User.model.js";
import TokenBlacklist from "../../../DB/model/TokenBlacklist.model.js";
import { compareHash } from "../../../util/security/hash.js";
import { generateEncrypt } from "../../../util/security/crypt.js";
import { emailEvent } from "../../../util/event/email.confirm.js";
import {
  extractBearerToken,
  generateToken,
  verifyToken,
} from "../../../util/security/token.js";
import { AppError } from "../../../util/error/AppError.js";
import { serializeUser } from "../../../util/user/serialize.user.js";

const loginAttempts = new Map();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function getLoginKey(email) {
  return `login:${email.toLowerCase().trim()}`;
}

function checkLoginLockout(email) {
  const key = getLoginKey(email);
  const entry = loginAttempts.get(key);
  if (!entry) return;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    const elapsed = Date.now() - entry.lockedAt;
    const remaining = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 1000);
    if (elapsed < LOCKOUT_DURATION_MS) {
      throw new AppError(`Account temporarily locked. Try again in ${remaining} seconds.`, 429);
    }
    loginAttempts.delete(key);
  }
}

function recordLoginAttempt(email, success) {
  const key = getLoginKey(email);
  if (success) {
    loginAttempts.delete(key);
    return;
  }
  const entry = loginAttempts.get(key) || { count: 0, lockedAt: 0 };
  entry.count += 1;
  entry.lockedAt = Date.now();
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    setTimeout(() => loginAttempts.delete(key), LOCKOUT_DURATION_MS);
  }
  loginAttempts.set(key, entry);
}

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const DEFAULT_ROLE = "User";

function enforcePasswordPolicy(password) {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10);
  const requireUpper = process.env.PASSWORD_REQUIRE_UPPERCASE !== "false";
  const requireLower = process.env.PASSWORD_REQUIRE_LOWERCASE !== "false";
  const requireNumbers = process.env.PASSWORD_REQUIRE_NUMBERS !== "false";
  const requireSpecial = process.env.PASSWORD_REQUIRE_SPECIAL !== "false";

  if (password.length < minLength) {
    throw new AppError(`Password must be at least ${minLength} characters`, 400);
  }
  if (requireUpper && !/[A-Z]/.test(password)) {
    throw new AppError("Password must contain an uppercase letter", 400);
  }
  if (requireLower && !/[a-z]/.test(password)) {
    throw new AppError("Password must contain a lowercase letter", 400);
  }
  if (requireNumbers && !/\d/.test(password)) {
    throw new AppError("Password must contain a number", 400);
  }
  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    throw new AppError("Password must contain a special character", 400);
  }
}

export const signupService = async (reqData = {}) => {
  if (!reqData || typeof reqData !== "object") {
    throw new AppError("Invalid signup payload", 400);
  }

  const {
    name = "",
    username = "",
    email = "",
    password = "",
    confirmationPassword = "",
    phone = "",
  } = reqData;

  const resolvedName = name || username || "";
  const resolvedPassword = String(password || "");
  const resolvedConfirmationPassword = String(confirmationPassword || "");

  const resolvedEmail = normalizeEmail(email);
  if (!resolvedEmail) {
    throw new AppError("Email is required", 400);
  }

  if (resolvedPassword !== resolvedConfirmationPassword) {
    throw new AppError("Password mismatch", 409);
  }

  enforcePasswordPolicy(resolvedPassword);

  const checkEmail = await userModel.findOne({ email: resolvedEmail });
  if (checkEmail) {
    throw new AppError("Email already exists", 409);
  }

  if (!resolvedName.trim()) {
    throw new AppError("Name is required", 400);
  }

  if (!phone.trim()) {
    throw new AppError("Phone is required", 400);
  }

  const encryptedPhone = await generateEncrypt({
    text: phone,
  });

  const user = await userModel.create({
    name: resolvedName,
    email: resolvedEmail,
    password: resolvedPassword,
    phone: encryptedPhone,
    confirmEmail: false,
    role: DEFAULT_ROLE,
  });

  emailEvent.emit("sendConfirmEmail", { email: resolvedEmail });

  return serializeUser(user);
};

export const confirmEmailService = async (authorization) => {
  const token = extractBearerToken(authorization);
  if (!token) {
    throw new AppError("Authorization token is required", 401);
  }

  const decoded = verifyToken({
    token,
    signature: process.env.EMAIL_TOKEN_SIGNATURE || process.env.TOKEN_SIGNATURE,
  });

  if (!decoded?.email) {
    throw new AppError("Invalid token", 400);
  }

  const user = await userModel
    .findOne({ email: normalizeEmail(decoded.email) })
    .select("-password");
  if (!user) {
    throw new AppError("Email not found", 404);
  }

  if (user.confirmEmail) {
    throw new AppError("Email already confirmed", 409);
  }

  user.confirmEmail = true;
  await user.save();
  return serializeUser(user);
};

export const loginService = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  checkLoginLockout(normalizedEmail);

  const user = await userModel.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    recordLoginAttempt(normalizedEmail, false);
    throw new AppError("Invalid email or password", 400);
  }

  const checkPassword = await compareHash({
    plainText: password,
    hashValue: user.password,
  });
  if (!checkPassword) {
    recordLoginAttempt(normalizedEmail, false);
    throw new AppError("Invalid email or password", 400);
  }

  recordLoginAttempt(normalizedEmail, true);

  const sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || "1440", 10);
  const token = generateToken({
    payload: { id: user._id, role: user.role },
    signature: process.env.TOKEN_SIGNATURE,
    expiresIn: sessionTimeoutMinutes * 60,
  });

  return { token, user: serializeUser(user) };
};

export const logoutService = async (authorization) => {
  const token = extractBearerToken(authorization);
  if (token) {
    try {
      const decoded = verifyToken({
        token,
        signature: process.env.TOKEN_SIGNATURE,
      });
      if (decoded?.exp) {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        await TokenBlacklist.findOneAndUpdate(
          { tokenHash },
          {
            $setOnInsert: {
              tokenHash,
              expiresAt: new Date(decoded.exp * 1000),
              reason: "logout",
            },
          },
          { upsert: true },
        );
      }
    } catch {
      // Token may be expired or invalid — still consider logout successful
    }
  }
  return { message: "Logged out successfully" };
};
