const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/env");
const logger = require("./utils/logger");

mongoose
  .connect(`${config.mongoUri}/${config.dbName}`)
  .then(() => logger.info("Db success conn"))
  .catch((err) => logger.error("DB connection error", err));

const server = app.listen(config.port, () => {
  logger.info(`App running on port ${config.port}`);
});

// Graceful shutdown handling
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...");
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    logger.info("💥 Process terminated!");
    mongoose.connection.close(false).then(() => {
      process.exit(0);
    });
  });
});
