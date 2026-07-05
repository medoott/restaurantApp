import jwt from "jsonwebtoken";
import userModel from "../DB/model/User.model.js";
import TableSession from "../DB/model/TableSession.model.js";
import { extractBearerToken, resolveTokenSecret } from "../util/security/token.js";

export async function optionalAuth(req, res, next) {
  const { authorization } = req.headers;
  const token = extractBearerToken(authorization);

  if (token) {
    try {
      const [scheme] = String(authorization || "").trim().split(/\s+/);
      let signature;
      switch (scheme) {
        case "Admin":
          signature = process.env.TOKEN_SIGNATURE_ADMIN;
          break;
        default:
          signature = process.env.TOKEN_SIGNATURE;
      }

      let decoded = null;
      try {
        decoded = jwt.verify(token, resolveTokenSecret(signature), { algorithms: ["HS256"] });
      } catch {
        // Token invalid or expired — proceed as unauthenticated
      }

      if (decoded?.id) {
        const user = await userModel.findById(decoded.id).select("-password").lean();
        if (user) {
          req.user = user;
        }
      }
    } catch {
      // User lookup failed — proceed as unauthenticated
    }
  }

  if (!req.user && req.body?.sessionToken) {
    try {
      const session = await TableSession.findOne({
        sessionToken: req.body.sessionToken,
        status: "active",
      }).lean();
      if (session && session.expiresAt > new Date()) {
        req.tableSession = session;
      }
    } catch {
      // Session lookup failed — proceed without session
    }
  }

  next();
}
