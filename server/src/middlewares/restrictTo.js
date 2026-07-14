const APIError = require("../utils/APIError");

const restrictTo = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new APIError("Forbidden", 403);
    }
    next();
  };
};
module.exports = restrictTo;
