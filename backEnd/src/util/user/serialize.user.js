import { Decrypt } from "../security/crypt.js";

export const serializeUser = (user, { decryptPhone = false } = {}) => {
  if (!user) {
    return null;
  }

  const plainUser =
    typeof user.toObject === "function" ? user.toObject() : { ...user };
    const { password, __v, isDeveloper, ...safeUser } = plainUser;

  if (safeUser._id && !safeUser.id) {
    safeUser.id = String(safeUser._id);
  }

  if (safeUser._id && typeof safeUser._id !== "string") {
    safeUser._id = String(safeUser._id);
  }

  if (decryptPhone && safeUser.phone) {
    try {
      safeUser.phone = Decrypt({ ciphertext: safeUser.phone });
    } catch {
      safeUser.phone = "";
    }
  }

  if (safeUser.confirmEmail === undefined) {
    safeUser.confirmEmail = false;
  }

  return safeUser;
};
