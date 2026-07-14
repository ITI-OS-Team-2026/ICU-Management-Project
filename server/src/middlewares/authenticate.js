const jwt = require("jsonwebtoken");
const util = require("util");
const jwtVerify = util.promisify(jwt.verify);
const APIError = require("../utils/APIError");

const authenticate = async (req, res, next) => {
  const tokenData = req.headers.authorization;
  if (!tokenData) {
    throw new APIError("Authentication token is required", 401);
  }
  const token = tokenData.split(" ")[1];

  if (!token) {
    throw new APIError("Invalid token format", 401);
  }

  const decodedData = await jwtVerify(token, process.env.JWT_SECRET);

  req.user = {
    userId: decodedData.userId,
    role: decodedData.role,
  };

  next();
};

module.exports = authenticate;
