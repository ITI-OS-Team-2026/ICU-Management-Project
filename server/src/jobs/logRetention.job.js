const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prismaClient");
const config = require("../config/env");
const logger = require("../utils/logger");

/**
 * Nightly cleanup for the tables that only ever grow: session tokens and the
 * three audit/log trails (AuditLog, LoginAttempt, AiQueryLog). Nothing today
 * ever purges these — left alone they grow forever and every scan, backup,
 * and index on them gets slower for it.
 *
 * Two different policies, on purpose:
 *
 *  - LoginAttempt is operational exhaust — a rate-limiting/lockout signal
 *    that's only useful for a bounded recent window. Hard-deleted once past
 *    its retention window.
 *
 *  - AuditLog is the compliance trail (who did what to which patient record,
 *    and when) — the one table here it would be actively wrong to just
 *    delete. It is archived to append-only, gzip-free JSON Lines files on
 *    disk *before* the matching rows are removed, so "we deleted it from the
 *    live table" and "we destroyed the record" are not the same event. Ship
 *    that archive directory to cold storage (S3 Glacier, etc.) on whatever
 *    cadence your retention policy actually requires — this job's job is
 *    only to keep it out of the hot table.
 *
 *  - AiQueryLog (patient-mode assistant Q&A) sits in between: clinically
 *    relevant but not a security/compliance record, so it gets the same
 *    "archive then delete" treatment as AuditLog rather than a bare delete.
 *
 * Deletes are batched by id rather than one `deleteMany` per table: a single
 * unbounded DELETE against a multi-million-row table holds its locks and its
 * position in the WAL for the entire statement, which on Postgres stalls
 * concurrent writers and bloats replication lag for however long that takes.
 * Chunking by CHUNK_SIZE keeps each transaction short, so anything else
 * touching these tables is never blocked for more than one small batch.
 */

const CHUNK_SIZE_FALLBACK = 500;

let cycleInFlight = false;

/** Delete rows older than `cutoff` in fixed-size batches. Returns total removed. */
async function batchedDelete(model, whereOlderThan, chunkSize) {
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await model.findMany({
      where: whereOlderThan,
      select: { id: true },
      take: chunkSize,
    });
    if (rows.length === 0) break;

    await model.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    total += rows.length;

    // A batch smaller than the page size means we just took the last one.
    if (rows.length < chunkSize) break;
  }
  return total;
}

/**
 * Archive rows older than `cutoff` to a JSON Lines file, then delete them in
 * the same batched fashion. Writes happen batch-by-batch so a crash mid-run
 * loses at most one batch's worth of already-archived-but-not-yet-deleted
 * rows — re-running the job just re-archives them (append-only, harmless)
 * rather than silently losing anything.
 */
async function archiveThenDelete(model, whereOlderThan, chunkSize, archiveFilePath) {
  fs.mkdirSync(path.dirname(archiveFilePath), { recursive: true });

  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await model.findMany({ where: whereOlderThan, take: chunkSize });
    if (rows.length === 0) break;

    const lines = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
    fs.appendFileSync(archiveFilePath, lines, "utf8");

    await model.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    total += rows.length;

    if (rows.length < chunkSize) break;
  }
  return total;
}

const runRetentionCycle = async () => {
  if (cycleInFlight) {
    logger.warn("Log retention cycle still running from a previous tick — skipping this one.");
    return;
  }
  cycleInFlight = true;

  const chunkSize = config.logRetentionBatchSize || CHUNK_SIZE_FALLBACK;
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  logger.info("Running log retention cycle...");
  try {
    // Login attempts past the security-log retention window.
    const loginAttemptCutoff = daysAgo(config.loginAttemptRetentionDays);
    const loginAttemptsDeleted = await batchedDelete(
      prisma.loginAttempt,
      { attemptedAt: { lt: loginAttemptCutoff } },
      chunkSize
    );
    if (loginAttemptsDeleted > 0) {
      logger.info(`Log retention: purged ${loginAttemptsDeleted} login attempt record(s) older than ${config.loginAttemptRetentionDays}d.`);
    }

    // Audit log — archived to disk before deletion; this is the compliance trail.
    const auditCutoff = daysAgo(config.auditLogRetentionDays);
    const auditArchiveFile = path.join(
      config.auditLogArchiveDir,
      `audit-log-${now.toISOString().slice(0, 10)}.jsonl`
    );
    const auditArchived = await archiveThenDelete(
      prisma.auditLog,
      { createdAt: { lt: auditCutoff } },
      chunkSize,
      auditArchiveFile
    );
    if (auditArchived > 0) {
      logger.info(`Log retention: archived and purged ${auditArchived} audit log row(s) older than ${config.auditLogRetentionDays}d to ${auditArchiveFile}.`);
    }

    // AI query log (patient-mode assistant Q&A) — same archive-first treatment.
    const aiQueryCutoff = daysAgo(config.aiQueryLogRetentionDays);
    const aiQueryArchiveFile = path.join(
      config.auditLogArchiveDir,
      `ai-query-log-${now.toISOString().slice(0, 10)}.jsonl`
    );
    const aiQueryArchived = await archiveThenDelete(
      prisma.aiQueryLog,
      { createdAt: { lt: aiQueryCutoff } },
      chunkSize,
      aiQueryArchiveFile
    );
    if (aiQueryArchived > 0) {
      logger.info(`Log retention: archived and purged ${aiQueryArchived} AI query log row(s) older than ${config.aiQueryLogRetentionDays}d to ${aiQueryArchiveFile}.`);
    }

    logger.info("Log retention cycle completed.");
  } catch (error) {
    logger.error(`Error in log retention cycle: ${error.message}`);
    throw error;
  } finally {
    cycleInFlight = false;
  }
};

const startLogRetention = () => {
  cron.schedule(config.logRetentionCron, runRetentionCycle);
  logger.info(`Log retention job scheduled (${config.logRetentionCron}).`);
};

module.exports = {
  startLogRetention,
  runRetentionCycle,
};
