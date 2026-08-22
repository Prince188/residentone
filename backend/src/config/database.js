const mongoose = require("mongoose");
const { config } = require("./index");
const logger = require("./logger");

async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
}

module.exports = { connectDatabase };
