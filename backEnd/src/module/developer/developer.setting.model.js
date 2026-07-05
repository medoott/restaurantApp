import mongoose, { Schema } from "mongoose";

const developerSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: Schema.Types.Mixed,
    description: String,
    category: {
      type: String,
      enum: ["system", "security", "performance", "debug", "maintenance", "integration"],
      default: "system",
    },
    sensitive: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const DeveloperSetting = mongoose.models.DeveloperSetting || mongoose.model("DeveloperSetting", developerSettingSchema);

export default DeveloperSetting;
