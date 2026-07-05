import bcrypt from "bcrypt";

const resolveSaltRounds = (salt = process.env.SALT) => {
  const parsedSalt = Number.parseInt(String(salt || ""), 10);
  if (Number.isFinite(parsedSalt) && parsedSalt >= 10) {
    return parsedSalt;
  }

  return 12;
};

export const generateHash = ({
  plainText = "",
  salt = process.env.SALT,
} = {}) => {
  return bcrypt.hash(plainText, resolveSaltRounds(salt));
};

export const compareHash = ({ plainText = "", hashValue = "" } = {}) => {
  if (!hashValue) {
    return false;
  }

  return bcrypt.compare(plainText, hashValue);
};
