import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import { log } from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "";

const startServer = async (): Promise<void> => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in .env file");

    await mongoose.connect(MONGO_URI);
    log.info("✅ MongoDB connected successfully");

    app.listen(PORT, () => log.info(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    log.error("❌ Failed to start server:", (error as Error).message);
    process.exit(1);
  }
};

startServer();
