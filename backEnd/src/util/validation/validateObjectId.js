import mongoose from "mongoose";

/**
 * Safely converts a value to a Mongoose ObjectId.
 * Returns null if the value is not a valid ObjectId.
 * @param {*} value
 * @returns {mongoose.Types.ObjectId|null}
 */
export function safeObjectId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str.length !== 24) return null;
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
}

/**
 * Validates that a value is a valid ObjectId, throws if not.
 * @param {*} value
 * @param {string} fieldName - Name for the error message
 * @returns {mongoose.Types.ObjectId}
 */
export function requireObjectId(value, fieldName = "ID") {
  const oid = safeObjectId(value);
  if (!oid) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return oid;
}
