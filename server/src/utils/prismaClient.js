require("dotenv").config();

const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

/**
 * Neon pooler (-pooler) + Prisma interactive $transaction often fails with:
 * "Unable to start a transaction in the given time".
 * Prefer DATABASE_URL without -pooler for this Node server, with a long enough
 * connect timeout so cold Neon computes can wake up.
 */
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 10,
  // Neon compute wake-up can take several seconds
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 30_000,
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  console.error("Unexpected idle PostgreSQL pool error:", err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
