const { generateSlots, buildMarRow } = require("./medication.schedule");

// Fixed reference day so slot assertions never depend on when the suite runs.
const DAY = new Date("2026-08-04T09:00:00");
const startOf = (h, m = 0) => {
  const d = new Date(DAY);
  d.setHours(h, m, 0, 0);
  return d;
};

const order = (overrides = {}) => ({
  id: "med-1",
  frequency: "OD",
  startDate: new Date("2026-08-01T08:00:00"),
  endDate: null,
  prescribedAt: new Date("2026-08-01T08:00:00"),
  isActive: true,
  administrations: [],
  ...overrides,
});

describe("generateSlots", () => {
  it("gives OD one slot a day", () => {
    expect(generateSlots(order({ frequency: "OD" }), DAY)).toHaveLength(1);
  });

  it("gives BD two slots and TDS three", () => {
    expect(generateSlots(order({ frequency: "BD" }), DAY)).toHaveLength(2);
    expect(generateSlots(order({ frequency: "TDS" }), DAY)).toHaveLength(3);
  });

  it("spaces Q6H four times a day on a fixed grid from midnight", () => {
    const slots = generateSlots(
      order({ frequency: "Q6H", startDate: new Date("2026-08-01T02:00:00") }),
      DAY
    );
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.getHours())).toEqual([0, 6, 12, 18]);
  });

  it("ignores the order's start time — orders carry a start date only", () => {
    const slots = generateSlots(
      order({ frequency: "Q12H", startDate: new Date("2026-08-01T14:20:00") }),
      DAY
    );
    expect(slots.map((s) => `${s.getHours()}:${s.getMinutes()}`)).toEqual(["0:0", "12:0"]);
  });

  it("gives every day of an interval order the same dose times", () => {
    const med = order({ frequency: "Q8H", startDate: new Date("2026-08-01T00:00:00") });
    const monday = generateSlots(med, new Date("2026-08-04T09:00:00")).map((s) => s.getHours());
    const tuesday = generateSlots(med, new Date("2026-08-05T09:00:00")).map((s) => s.getHours());
    expect(monday).toEqual([0, 8, 16]);
    expect(tuesday).toEqual(monday);
  });

  it("produces nothing before the order starts", () => {
    const slots = generateSlots(
      order({ frequency: "TDS", startDate: new Date("2026-08-10T08:00:00") }),
      DAY
    );
    expect(slots).toHaveLength(0);
  });

  it("produces nothing after the order ends", () => {
    const slots = generateSlots(
      order({ frequency: "TDS", endDate: new Date("2026-08-02T08:00:00") }),
      DAY
    );
    expect(slots).toHaveLength(0);
  });

  it("covers the whole of the final day", () => {
    const slots = generateSlots(
      order({ frequency: "TDS", endDate: new Date("2026-08-04T15:00:00") }),
      DAY
    );
    // The end date means "through the end of that day", so the 20:00 dose still
    // counts even though the stored instant is mid-afternoon.
    expect(slots.map((s) => s.getHours())).toEqual([8, 14, 20]);
  });

  it("gives STAT a single slot on its start day only", () => {
    const onDay = generateSlots(
      order({ frequency: "STAT", startDate: new Date("2026-08-04T11:30:00") }),
      DAY
    );
    expect(onDay).toHaveLength(1);
    expect(generateSlots(order({ frequency: "STAT" }), DAY)).toHaveLength(0);
  });

  it("schedules nothing for PRN, CONTINUOUS or OTHER", () => {
    for (const frequency of ["PRN", "CONTINUOUS", "OTHER"]) {
      expect(generateSlots(order({ frequency }), DAY)).toHaveLength(0);
    }
  });
});

describe("buildMarRow", () => {
  const now = startOf(15); // mid-afternoon: 08:00 is past, 14:00 just past, 20:00 ahead

  it("marks an unlogged past slot MISSED once the grace period lapses", () => {
    const row = buildMarRow(order({ frequency: "TDS" }), DAY, now);
    const byHour = Object.fromEntries(
      row.doses.map((d) => [new Date(d.scheduledTime).getHours(), d.status])
    );

    expect(byHour[8]).toBe("MISSED"); // 7h late
    expect(byHour[14]).toBe("DUE"); // inside the 60-minute grace period
    expect(byHour[20]).toBe("UPCOMING");
    expect(row.summary.missed).toBe(1);
  });

  it("takes the logged status for a slot that was actioned", () => {
    const row = buildMarRow(
      order({
        frequency: "TDS",
        administrations: [
          {
            id: "adm-1",
            status: "ADMINISTERED",
            scheduledTime: startOf(8),
            isArchived: false,
          },
        ],
      }),
      DAY,
      now
    );

    const eight = row.doses.find((d) => new Date(d.scheduledTime).getHours() === 8);
    expect(eight.status).toBe("ADMINISTERED");
    expect(row.summary.administered).toBe(1);
    expect(row.summary.missed).toBe(0);
  });

  it("snaps a slightly-late dose onto its slot rather than floating free", () => {
    const row = buildMarRow(
      order({
        frequency: "TDS",
        administrations: [
          { id: "adm-1", status: "ADMINISTERED", scheduledTime: startOf(8, 25), isArchived: false },
        ],
      }),
      DAY,
      now
    );

    expect(row.doses).toHaveLength(3); // not 4 — no orphan entry
    expect(row.doses.find((d) => new Date(d.scheduledTime).getHours() === 8).status).toBe(
      "ADMINISTERED"
    );
  });

  it("shows a PRN dose even though it has no schedule", () => {
    const row = buildMarRow(
      order({
        frequency: "PRN",
        administrations: [
          { id: "adm-1", status: "ADMINISTERED", scheduledTime: startOf(11), isArchived: false },
        ],
      }),
      DAY,
      now
    );

    expect(row.isScheduled).toBe(false);
    expect(row.doses).toHaveLength(1);
    expect(row.doses[0].status).toBe("ADMINISTERED");
  });

  it("ignores archived administrations", () => {
    const row = buildMarRow(
      order({
        frequency: "OD",
        administrations: [
          { id: "adm-1", status: "ADMINISTERED", scheduledTime: startOf(8), isArchived: true },
        ],
      }),
      DAY,
      now
    );

    expect(row.doses[0].status).toBe("MISSED");
  });

  it("stops holding a discontinued order to its schedule", () => {
    const row = buildMarRow(order({ frequency: "TDS", isActive: false }), DAY, now);
    expect(row.doses.every((d) => d.status === "NOT_APPLICABLE")).toBe(true);
    expect(row.summary.missed).toBe(0);
  });
});
