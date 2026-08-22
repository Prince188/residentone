const pino = require("pino");
const { config } = require("./index");

const logger = pino({
  level: config.isProduction ? "info" : "debug",
  transport: config.isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
});

module.exports = logger;
