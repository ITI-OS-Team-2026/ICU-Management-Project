const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const config = require("../config/env");

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
