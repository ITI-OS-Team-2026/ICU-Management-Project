const APIError = require("./APIError");

const throwIfNotFound = (resource, message = "Resource not found") => {
  if (!resource) throw new APIError(message, 404);
  return resource;
};

module.exports = throwIfNotFound;
