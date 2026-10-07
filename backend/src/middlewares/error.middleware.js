const { AppError } = require("../shared/utils/errors");
const logger = require("../config/logger");

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err.name === "ValidationError") {
    const message =
      Object.values(err.errors || {})
        .map((val) => val.message)
        .join(", ") || err.message;
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_ID", message: `Invalid ${err.path}: ${err.value}` },
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
