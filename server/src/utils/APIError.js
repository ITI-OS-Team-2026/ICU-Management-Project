class APIError extends Error {
  constructor(errorMessage, statusCode) {
    super(errorMessage);
    this.statusCode = statusCode || 500;
    this.isClientError = this.statusCode >= 400 && this.statusCode < 500;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = APIError;
