const { Pool } = require("pg");
const config = require("./config/env");
const app = require("./app");
const logger = require("./utils/logger");

const databaseUrl = config.databaseUrl;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

const normalizedDatabaseUrl = (() => {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return url.toString();
})();

const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function startServer() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    logger.info("PostgreSQL connection successful");

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
        pool.end().then(() => {
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
