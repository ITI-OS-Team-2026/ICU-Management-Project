require("dotenv").config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 8000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  cookieName: "smartcare_token",
  cookieMaxAge: 12 * 60 * 60 * 1000, // 12 hours in ms
  lockoutThreshold: 5,
  lockoutDurationMinutes: 15,
};
