const APIError = require("../utils/APIError");

module.exports = (err, req, res, next) => {
  console.error("ERROR", err.stack);

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      status: "fail",
      message: err.message,
      isClientError: err.statusCode >= 400 && err.statusCode < 500,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: `Invalid id format`,
      isClientError: true,
    });
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      status: "fail",
      message: `Resource already exists: ${field} = ${value}`,
      isClientError: true,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "fail",
      message: err.message,
      isClientError: true,
    });
  }

  if (
    err.name === "TokenExpiredError" ||
    err.name === "JsonWebTokenError" ||
    err.name === "NotBeforeError"
  ) {
    return res.status(401).json({
      status: "fail",
      message: "Authentication failed. Please log in again.",
      isClientError: true,
    });
  }

  // Prisma known request errors (validation / constraint)
  if (err.code === "P2000") {
    return res.status(400).json({
      status: "fail",
      message: "A provided value is too long for its column",
      isClientError: true,
    });
  }

  if (err.code === "P2002") {
    const fields = err.meta?.target;
    const fieldList = Array.isArray(fields) ? fields.join(", ") : fields || "field";
    return res.status(409).json({
      status: "fail",
      message: `Duplicate value for ${fieldList}`,
      isClientError: true,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      status: "fail",
      message: "Record not found",
      isClientError: true,
    });
  }

  res.status(500).json({
    status: "error",
    message: "Something went wrong",
    isClientError: false,
  });
};
