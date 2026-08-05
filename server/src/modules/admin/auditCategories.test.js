const {
  AUDIT_LEVEL_ACTIONS,
  AUDIT_TARGET_TABLES,
  AUDIT_CATEGORY_TABLES,
  AUDIT_CATEGORIES,
} = require("./auditCategories");

/**
 * Guards the audit log's classification maps.
 *
 * This exists because of a real bug: `TreatmentApproval`, `AiQueryLog` and
 * `AiSummary` were audited but absent from every category, so no category
 * filter in the admin UI could reach them. Nine rows were present in the
 * database and unreachable in the interface, with nothing to indicate it.
 *
 * Deliberately free of database and HTTP setup so it runs anywhere, instantly,
 * and fails on the pull request that adds an audited table rather than months
 * later when someone notices a filter returning nothing.
 */

describe("audit category coverage", () => {
  it("classifies every audited table into exactly one category", () => {
    const orphans = [];
    const duplicated = [];

    for (const table of AUDIT_TARGET_TABLES) {
      const owners = AUDIT_CATEGORIES.filter((category) =>
        AUDIT_CATEGORY_TABLES[category].includes(table)
      );
      if (owners.length === 0) orphans.push(table);
      if (owners.length > 1) duplicated.push(`${table} (in ${owners.join(", ")})`);
    }

    // Named explicitly so a failure says which table to classify, rather than
    // leaving whoever broke it to diff two lists by eye.
    expect(orphans).toEqual([]);
    expect(duplicated).toEqual([]);
  });

  it("does not categorise tables the application never audits", () => {
    const known = new Set(AUDIT_TARGET_TABLES);
    const unknown = Object.values(AUDIT_CATEGORY_TABLES)
      .flat()
      .filter((table) => !known.has(table));

    // A category pointing at a table nobody writes is a filter button that can
    // only ever return nothing.
    expect(unknown).toEqual([]);
  });

  it("assigns every audit action exactly one severity level", () => {
    const seen = new Map();

    for (const [level, actions] of Object.entries(AUDIT_LEVEL_ACTIONS)) {
      for (const action of actions) {
        seen.set(action, [...(seen.get(action) || []), level]);
      }
    }

    const duplicated = [...seen.entries()]
      .filter(([, levels]) => levels.length > 1)
      .map(([action, levels]) => `${action} (in ${levels.join(", ")})`);

    expect(duplicated).toEqual([]);
  });
});
