require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT) || 8000,
  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME,
  jwtSecret: process.env.JWT_SECRET,
};
