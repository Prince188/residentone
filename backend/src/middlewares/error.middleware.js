const { AppError } = require("../shared/utils/errors");
const logger = require("../config/logger");

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  logger.error(err, "Unhandled error: " + err.message);
  console.error("DEBUG UNHANDLED ERROR:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    },
  });
}

module.exports = { errorHandler };
