import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  reason: {
    type: String,
    enum: ["logout", "revoke", "password_change"],
    default: "logout",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("TokenBlacklist", tokenBlacklistSchema);
