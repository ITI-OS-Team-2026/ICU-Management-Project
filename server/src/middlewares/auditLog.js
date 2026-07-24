const prisma = require("../utils/prismaClient");

// Runs the main DB query and its audit log record together in a transaction.
// If either operation fails, the transaction rolls back.
const auditedTransaction = async (req, auditMeta, callback) => {
  return prisma.$transaction(
    async (tx) => {
      // Execute the business logic within the transaction
      const outcome = await callback(tx);

      // Build and insert the audit row in the same transaction
      await tx.auditLog.create({
        data: {
          userId: outcome.userId || req?.user?.id || null,
          action: auditMeta.action,
          targetTable: auditMeta.targetTable,
          targetId: outcome.targetId || null,
          oldValues: outcome.oldValues || null,
          newValues: outcome.newValues || null,
          ipAddress: outcome.ipAddress || req?.ip || req?.connection?.remoteAddress || null,
          userAgent: outcome.userAgent || (req?.get ? req.get("User-Agent") : null) || null,
        },
      });

      return outcome.result;
    },
    {
      // Prisma 7 + pg adapter defaults maxWait to 2s, which fails on Neon cold starts
      maxWait: 20_000,
      timeout: 60_000,
    }
  );
};

module.exports = { auditedTransaction };
