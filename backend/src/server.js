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
