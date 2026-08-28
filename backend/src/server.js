const mongoose = require("mongoose");
const socketHelper = require("./socket");

// Centralized real-time update triggers for all models
mongoose.plugin((schema) => {
  schema.post("save", function (doc) {
    if (doc && doc.societyId) {
      const modelName = doc.constructor && doc.constructor.modelName;
      if (modelName) {
        socketHelper.emitToSociety(String(doc.societyId), `${modelName.toLowerCase()}:change`, {
          id: doc._id,
          action: "save",
        });
      }
    }
  });

  schema.post("findOneAndUpdate", function (doc) {
    if (doc && doc.societyId) {
      const modelName = (this.model && this.model.modelName) || (doc.constructor && doc.constructor.modelName);
      if (modelName) {
        socketHelper.emitToSociety(String(doc.societyId), `${modelName.toLowerCase()}:change`, {
          id: doc._id,
          action: "save",
        });
      }
    }
  });
});

const http = require("http");
const app = require("./app");
const { config } = require("./config");
const { connectDatabase } = require("./config/database");
const { initSocket } = require("./socket");
const logger = require("./config/logger");

async function startServer() {
  await connectDatabase();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    logger.info(`ResidentOne API running on port ${config.port}`);
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
