import mongoose from "mongoose";

const connectedDB = async () => {
  if (!process.env.DB_URL) {
    throw new Error("Missing DB_URL");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(process.env.DB_URL, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  console.log("Connected to DB");
};

export default connectedDB;
