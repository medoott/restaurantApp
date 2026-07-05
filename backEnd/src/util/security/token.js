import jwt from "jsonwebtoken";

const DEFAULT_SIGNATURE = process.env.TOKEN_SIGNATURE;

export const resolveTokenSecret = (signature) => {
  const secret = signature || DEFAULT_SIGNATURE;
  if (!secret) {
    throw new Error("Missing TOKEN_SIGNATURE");
  }
  return secret;
};

export const generateToken = ({
  payload = {},
  signature = DEFAULT_SIGNATURE,
  options = {},
  expiresIn,
} = {}) => {
  const secret = resolveTokenSecret(signature);
  const signOptions = {
    ...options,
    ...(expiresIn !== undefined ? { expiresIn } : {}),
  };
  return jwt.sign(payload, secret, { ...signOptions, algorithm: 'HS256' });
};

export const verifyToken = ({
  token = "",
  signature = DEFAULT_SIGNATURE,
} = {}) => {
  const secret = resolveTokenSecret(signature);
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
};

export const extractBearerToken = (authorization = "") => {
  const value = String(authorization || "").trim();
  if (!value) return "";

  const match = value.match(/^(Bearer|Admin)\s+(.+)$/);
  if (match) return match[2];

  return "";
};
