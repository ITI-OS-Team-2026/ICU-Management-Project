const jwt = require("jsonwebtoken");
const config = require("../config/env");
const APIError = require("../utils/APIError");

// Verifies the JWT from the HttpOnly cookie and attaches the user's ID and role to req.user.
// If missing or invalid, returns 401 and signals the frontend to clear its session.
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.[config.cookieName];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
      clearSession: true,
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized",
      clearSession: true,
    });
  }
};

module.exports = verifyToken;
