// Turns a medication order (frequency + start/end date) into the concrete dose
// slots a nurse is expected to act on for a given day, then matches each slot
// against what was actually logged.
//
// Ward clock convention: ICU rounds start at 06:00, so daily schedules hang off
// that hour rather than midnight. Interval frequencies (Q4H/Q6H/...) run from
// the order's start time so an order written at 14:20 is due at 14:20, not at
// an arbitrary wall-clock grid.

// How many minutes past a slot before an unlogged dose counts as MISSED rather
// than merely DUE. Wide enough to survive a handover, tight enough to matter.
const GRACE_PERIOD_MINUTES = 60;

// Fixed times of day, in ward-local hours, for the named daily frequencies.
const DAILY_SLOT_HOURS = {
  OD: [8],
  BD: [8, 20],
  TDS: [8, 14, 20],
  QDS: [8, 12, 16, 20],
};

const INTERVAL_HOURS = {
  Q4H: 4,
  Q6H: 6,
  Q8H: 8,
  Q12H: 12,
};

// Frequencies that produce no fixed schedule: the nurse logs them ad hoc.
const UNSCHEDULED = new Set(["PRN", "CONTINUOUS", "OTHER"]);

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Dose slots for one medication on one calendar day.
 *
 * @param {Object} medication - a Medication row (frequency, startDate, endDate, prescribedAt)
 * @param {Date} day - any instant within the target day
 * @returns {Date[]} slot times, ascending. Empty for unscheduled frequencies.
 */
const generateSlots = (medication, day) => {
  const { frequency } = medication;
  if (UNSCHEDULED.has(frequency)) return [];

  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  // An order is only live between its start and end dates. Orders carry a
  // start/end *date*, so the end date means "through the end of that day" —
  // taking it literally as midnight would drop the final day's doses.
  const orderStart = new Date(medication.startDate || medication.prescribedAt);
  const orderEnd = medication.endDate ? endOfDay(medication.endDate) : null;
  if (orderEnd && orderEnd < dayStart) return [];

  // STAT is a single dose at the moment the order goes live.
  if (frequency === "STAT") {
    return orderStart >= dayStart && orderStart <= dayEnd ? [orderStart] : [];
  }

  const withinOrder = (t) => t >= orderStart && (!orderEnd || t <= orderEnd);

  if (DAILY_SLOT_HOURS[frequency]) {
    return DAILY_SLOT_HOURS[frequency]
      .map((hour) => {
        const slot = new Date(dayStart);
        slot.setHours(hour, 0, 0, 0);
        return slot;
      })
      .filter(withinOrder);
  }

  const intervalHours = INTERVAL_HOURS[frequency];
  if (!intervalHours) return [];

  // A fixed daily grid from midnight: Q6H is 00:00, 06:00, 12:00, 18:00 on
  // every date. Dose times used to be anchored to the order's start *time*,
  // which no longer exists — orders carry a start date only — and anchoring to
  // an arbitrary minute meant no two drugs shared a round.
  const slots = [];
  for (let hour = 0; hour < 24; hour += intervalHours) {
    const slot = new Date(dayStart);
    slot.setHours(hour, 0, 0, 0);
    slots.push(slot);
  }

  return slots.filter(withinOrder);
};

// Administrations are matched to the nearest slot within half an interval, so a
// dose given at 08:12 settles onto the 08:00 slot rather than floating free.
const matchAdministrations = (slots, administrations) => {
  const remaining = [...administrations];
  const matched = new Map();

  for (const slot of slots) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    remaining.forEach((admin, index) => {
      const distance = Math.abs(new Date(admin.scheduledTime).getTime() - slot.getTime());
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    // 2h either side: wide enough for a late round, narrow enough that a Q4H
    // order's neighbouring slots can't steal each other's doses.
    if (bestIndex >= 0 && bestDistance <= 2 * 60 * 60 * 1000) {
      matched.set(slot.getTime(), remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }
  }

  return { matched, unmatched: remaining };
};

/**
 * The MAR row for one medication on one day: every expected slot with its
 * status, plus any logged doses that don't belong to a slot (PRN, extra doses).
 *
 * Slot status is either the logged administration's own status, or a derived
 * one: MISSED once the grace period has passed, DUE inside it, UPCOMING before.
 */
const buildMarRow = (medication, day, now = new Date()) => {
  const administrations = (medication.administrations || []).filter((a) => !a.isArchived);
  const slots = generateSlots(medication, day);
  const { matched, unmatched } = matchAdministrations(slots, administrations);
  const graceMs = GRACE_PERIOD_MINUTES * 60 * 1000;

  const scheduledDoses = slots.map((slot) => {
    const administration = matched.get(slot.getTime()) || null;

    let status;
    if (administration) {
      status = administration.status;
    } else if (!medication.isActive) {
      // A discontinued order stops generating obligations.
      status = "NOT_APPLICABLE";
    } else if (now.getTime() > slot.getTime() + graceMs) {
      status = "MISSED";
    } else if (now.getTime() >= slot.getTime()) {
      status = "DUE";
    } else {
      status = "UPCOMING";
    }

    return {
      scheduledTime: slot.toISOString(),
      status,
      isOverdue: status === "MISSED",
      administration,
    };
  });

  // PRN / continuous / off-schedule doses still need to be visible.
  const unscheduledDoses = unmatched.map((administration) => ({
    scheduledTime: new Date(administration.scheduledTime).toISOString(),
    status: administration.status,
    isOverdue: false,
    administration,
  }));

  const doses = [...scheduledDoses, ...unscheduledDoses].sort(
    (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
  );

  return {
    ...medication,
    isScheduled: slots.length > 0,
    doses,
    summary: {
      total: doses.length,
      administered: doses.filter((d) => d.status === "ADMINISTERED").length,
      missed: doses.filter((d) => d.status === "MISSED").length,
      due: doses.filter((d) => d.status === "DUE").length,
    },
  };
};

module.exports = {
  GRACE_PERIOD_MINUTES,
  DAILY_SLOT_HOURS,
  INTERVAL_HOURS,
  UNSCHEDULED,
  generateSlots,
  buildMarRow,
};
