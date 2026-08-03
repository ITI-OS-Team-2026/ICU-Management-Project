/**
 * Audit log classification: which actions count as which severity, and which
 * target tables belong to which category.
 *
 * These live in their own module, free of Prisma and Express, so the coverage
 * test beside them can run without a database — the whole point of that test is
 * to fail the moment a new audited table is added without being classified.
 *
 * The rule both maps must satisfy: **every value must belong to exactly one
 * bucket.** Anything unclassified is written to the log and then cannot be
 * reached by any filter in the UI — invisible, but present. For an audit trail
 * that is the worst possible failure, because nothing looks broken.
 */

/** Keep in sync with the AuditAction enum in prisma/audit.prisma. */
const AUDIT_LEVEL_ACTIONS = {
  Critical: ['ARCHIVE', 'ACCOUNT_LOCKED'],
  Warning: ['UPDATE'],
  Info: ['LOGIN', 'LOGOUT', 'CREATE', 'VIEW', 'GENERATE_SUMMARY', 'QUERY_RAG'],
};

/**
 * Every `targetTable` value the application can write, gathered from the
 * `auditedTransaction` calls and the `requireRole` middleware.
 *
 * Adding an audited table means adding it here *and* to a category below; the
 * test enforces both.
 */
const AUDIT_TARGET_TABLES = [
  'Patient',
  'Allergy',
  'MedicalHistory',
  'Admission',
  'AdmissionNurse',
  'MedicalDocument',
  'TreatmentApproval',
  'FollowUp',
  'AiQueryLog',
  'AiSummary',
  'AiChatSession',
  'User',
  'Bed',
  'route_access',
];

const AUDIT_CATEGORY_TABLES = {
  Patients: ['Patient', 'Allergy', 'MedicalHistory'],
  Admissions: ['Admission', 'AdmissionNurse'],
  Documents: ['MedicalDocument'],
  // Care-plan decisions: what was proposed, approved, and followed up.
  Treatments: ['TreatmentApproval', 'FollowUp'],
  // Every interaction with the assistants, kept auditable because clinicians
  // act on what these answer.
  AI: ['AiQueryLog', 'AiSummary', 'AiChatSession'],
  // `route_access` is a denied-authorisation event from the requireRole
  // middleware — a security signal, and the reason this category is not just
  // user and bed administration.
  Admin: ['User', 'Bed', 'route_access'],
};

/** Filter values the API accepts, in the order the UI shows them. */
const AUDIT_CATEGORIES = Object.keys(AUDIT_CATEGORY_TABLES);

module.exports = {
  AUDIT_LEVEL_ACTIONS,
  AUDIT_TARGET_TABLES,
  AUDIT_CATEGORY_TABLES,
  AUDIT_CATEGORIES,
};
