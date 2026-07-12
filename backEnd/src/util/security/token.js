import jwt from "jsonwebtoken";

const DEFAULT_SIGNATURE = process.env.TOKEN_SIGNATURE;

export const parseAuthorizationHeader = (authorization = "") => {
  const value = String(authorization || "").trim();
  if (!value) return { scheme: null, token: "" };

  const match = value.match(/^([A-Za-z]+)\s+(.+)$/);
  if (!match) {
    return { scheme: null, token: value };
  }

  return { scheme: match[1], token: match[2] };
};

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
  return jwt.sign(payload, secret, { ...signOptions, algorithm: "HS256" });
};

export const verifyToken = ({
  token = "",
  signature = DEFAULT_SIGNATURE,
} = {}) => {
  const secret = resolveTokenSecret(signature);
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
};

export const extractBearerToken = (authorization = "") => {
  const { token } = parseAuthorizationHeader(authorization);
  return token;
};
