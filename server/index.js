const config = require("./src/config/env");
const app = require("./app");
const logger = require("./src/utils/logger");
const prisma = require("./src/utils/prismaClient");

async function startServer() {
  try {
    await prisma.$connect();
    
    logger.info("PostgreSQL connection successful via Prisma");

    const server = app.listen(config.port, () => {
      logger.info(`App running on port ${config.port}`);
    });

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
        prisma.$disconnect().then(() => {
          process.exit(0);
        });
      });
    });
  } catch (err) {
    logger.error("DB connection error", err);
    process.exit(1);
  }
}

startServer();
