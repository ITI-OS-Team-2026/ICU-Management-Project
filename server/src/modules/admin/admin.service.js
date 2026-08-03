const bcrypt = require("bcrypt");
const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const mapRoleToPrisma = (role) => {
  const map = {
    nurse: "ICU_NURSE",
    resident: "MEDICAL_RESIDENT",
    specialist: "ICU_SPECIALIST",
    admin: "SYSTEM_ADMIN"
  };
  
  const mapped = map[role?.toLowerCase()] || role;
  
  // Validate that the role is actually a valid Prisma enum, otherwise return a fake one to trigger empty results
  const validRoles = ["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST", "SYSTEM_ADMIN"];
  if (!validRoles.includes(mapped)) {
    return "INVALID_ROLE_MOCK"; // Prisma will throw if we use this, so we handle it below
  }
  return mapped;
};

const createUser = async (data) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() }
  });
  if (existingUser) {
    throw new APIError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(data.password || "ChangeMe123!", 10);
  
  const user = await prisma.user.create({
    data: {
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: mapRoleToPrisma(data.role),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    }
  });

  return {
    ...user,
    first_name: user.firstName,
    last_name: user.lastName,
    firstName: undefined,
    lastName: undefined
  };
};

const getUsers = async ({ role, status, search, page, limit }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  
  const where = {};
  if (role) {
    const mappedRole = mapRoleToPrisma(role);
    if (mappedRole === "INVALID_ROLE_MOCK") {
      return {
        data: [],
        meta: { total: 0, page: Number(page), limit: Number(limit) }
      };
    }
    where.role = mappedRole;
  }
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      }
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: users.map(u => ({
      ...u,
      first_name: u.firstName,
      last_name: u.lastName,
      firstName: undefined,
      lastName: undefined
    })),
    meta: {
      total,
      page: Number(page),
      limit: Number(limit)
    }
  };
};

const getUserStats = async () => {
  const [total, active, inactive] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } })
  ]);
  
  return {
    total,
    active,
    inactive
  };
};

// Ward-wide bed counts. The bed grid is paged now, so it can no longer add
// these up from the rows it has on screen.
const getBedStats = async () => {
  const [total, occupied, available, maintenance] = await Promise.all([
    prisma.bed.count(),
    prisma.bed.count({ where: { status: "OCCUPIED" } }),
    prisma.bed.count({ where: { status: "AVAILABLE" } }),
    prisma.bed.count({ where: { status: "MAINTENANCE" } }),
  ]);

  return { total, occupied, available, maintenance };
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    }
  });
  if (!user) throw new APIError("User not found", 404);
  
  return {
    ...user,
    first_name: user.firstName,
    last_name: user.lastName,
    firstName: undefined,
    lastName: undefined
  };
};

const updateUser = async (req, id, data) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError("User not found", 404);

  if (req.user.id === id && data.status && data.status !== "ACTIVE") {
    throw new APIError("You cannot deactivate or suspend your own account", 403);
  }

  const updateData = {};
  if (data.role) updateData.role = mapRoleToPrisma(data.role);
  if (data.status) updateData.status = data.status;

  if (data.role) {
    return auditedTransaction(req, { action: "UPDATE", targetTable: "User" }, async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        }
      });
      return {
        targetId: id,
        oldValues: { role: user.role, status: user.status },
        newValues: { role: updated.role, status: updated.status },
        result: {
          ...updated,
          first_name: updated.firstName,
          last_name: updated.lastName,
          firstName: undefined,
          lastName: undefined
        }
      };
    });
  } else {
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      }
    });
    return {
      ...updated,
      first_name: updated.firstName,
      last_name: updated.lastName,
      firstName: undefined,
      lastName: undefined
    };
  }
};

const deleteUser = async (req, id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError("User not found", 404);

  if (req.user.id === id) {
    throw new APIError("You cannot delete your own account", 403);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "User" }, async (tx) => {
    await tx.user.update({
      where: { id },
      data: { status: "INACTIVE" }
    });
    return {
      targetId: id,
      oldValues: { status: user.status },
      newValues: { status: "INACTIVE" },
      result: true
    };
  });
};

const resetUserPassword = async (req, id, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError("User not found", 404);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  return auditedTransaction(req, { action: "UPDATE", targetTable: "User" }, async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash }
    });
    return {
      targetId: id,
      oldValues: { passwordHash: "HIDDEN" },
      newValues: { passwordHash: "HIDDEN_NEW" },
      result: true
    };
  });
};

const createBed = async (data) => {
  const existingBed = await prisma.bed.findUnique({
    where: { bedNumber: data.bed_number }
  });
  if (existingBed) {
    throw new APIError("Bed already exists", 409);
  }

  const bed = await prisma.bed.create({
    data: {
      bedNumber: data.bed_number,
      status: "AVAILABLE"
    }
  });
  return {
    id: bed.id,
    bed_number: bed.bedNumber,
    status: bed.status
  };
};

// Pagination is opt-in: callers that pass `page` get { data, meta }, while
// bed-picker dropdowns that need every bed keep receiving a plain array.
const getBeds = async ({ status, page, limit }) => {
  const where = {};
  if (status) where.status = status;

  const paginated = page !== undefined && page !== null && page !== "";
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 12));

  const beds = await prisma.bed.findMany({
    where,
    orderBy: { bedNumber: "asc" },
    ...(paginated ? { skip: (currentPage - 1) * pageSize, take: pageSize } : {}),
    select: {
      id: true,
      bedNumber: true,
      status: true,
      admissions: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          patient: {
            select: {
              name: true,
            }
          },
          vitalSigns: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: {
              pulse: true
            }
          },
          diagnoses: {
            where: { status: "ACTIVE" },
            take: 1,
            select: {
              conditionName: true
            }
          }
        }
      }
    }
  });

  const rows = beds.map(b => {
    const activeAdmission = b.admissions?.[0] || null;
    const patientName = activeAdmission?.patient
      ? activeAdmission.patient.name
      : null;
    const latestVitals = activeAdmission?.vitalSigns?.[0] || null;
    const primaryDiagnosis = activeAdmission?.diagnoses?.[0]?.conditionName || null;

    return {
      id: b.id,
      bed_number: b.bedNumber,
      status: b.status,
      admissionId: activeAdmission?.id || null,
      patientName,
      diagnosis: primaryDiagnosis,
      heartRate: latestVitals?.pulse || null,
      spo2: latestVitals?.spo2 || null,
    };
  });

  if (!paginated) return rows;

  const total = await prisma.bed.count({ where });

  return {
    data: rows,
    meta: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const updateBed = async (req, id, data) => {
  const bed = await prisma.bed.findUnique({ where: { id } });
  if (!bed) throw new APIError("Bed not found", 404);

  const newStatus = data.status;

  if (newStatus === "OCCUPIED") {
    throw new APIError("Bed status can only be set to OCCUPIED through the admission workflow", 400);
  }

  const activeAdmission = await prisma.admission.findFirst({
    where: { bedId: id, status: "ACTIVE" }
  });

  if (activeAdmission) {
    throw new APIError("Cannot change bed status while there is an active admission. Please discharge or transfer the patient first.", 409);
  }

  if (newStatus === "MAINTENANCE" || newStatus === "OUT_OF_SERVICE") {
    if (bed.status !== "AVAILABLE") {
      throw new APIError("Bed must be AVAILABLE before taking it offline.", 409);
    }
  }

  return auditedTransaction(req, { action: "UPDATE", targetTable: "Bed", targetId: id }, async (tx) => {
    const updated = await tx.bed.update({
      where: { id },
      data: { status: newStatus }
    });

    return {
      targetId: id,
      oldValues: { status: bed.status },
      newValues: { status: newStatus },
      result: {
        id: updated.id,
        bed_number: updated.bedNumber,
        status: updated.status
      }
    };
  });
};



// Classification lives in ./auditCategories.js, guarded by the coverage test
// beside it: a table that is audited but uncategorised is written to the log
// and then unreachable by every filter in the UI.
const { AUDIT_LEVEL_ACTIONS, AUDIT_CATEGORY_TABLES } = require('./auditCategories');

/**
 * Time windows the audit log can be narrowed to.
 *
 * `24h` is the default rather than `today` on purpose. "Since local midnight"
 * makes the page read zero for the first hours of every day no matter how busy
 * the night was — and an ICU night shift straddles midnight, so the window
 * would reset in the middle of the very shift an auditor is looking at.
 */
const AUDIT_RANGES = ['24h', 'today', '7d', '30d', 'all'];
const DEFAULT_AUDIT_RANGE = '24h';

/**
 * Resolve a range key into a `createdAt` filter.
 *
 * Both the list and the stat cards run through this, which is what stops them
 * from answering different questions: previously the cards counted "today"
 * while the list was unfiltered, so a critical event from minutes ago could sit
 * directly beneath a card reading zero.
 *
 * @returns {{ createdAt?: { gte: Date } }} — spreadable into a Prisma `where`
 */
const resolveAuditRange = (range = DEFAULT_AUDIT_RANGE) => {
  const key = AUDIT_RANGES.includes(range) ? range : DEFAULT_AUDIT_RANGE;
  if (key === 'all') return {};

  const since = new Date();

  if (key === 'today') {
    since.setHours(0, 0, 0, 0);
  } else {
    const days = { '24h': 1, '7d': 7, '30d': 30 }[key];
    since.setDate(since.getDate() - days);
  }

  return { createdAt: { gte: since } };
};

const getAuditLogs = async (query = {}) => {
  const { search, page = 1, limit = 10, eventLevel, category, range } = query;

  const where = { ...resolveAuditRange(range) };

  if (search) {
    // `action` is an enum, so `contains` cannot be used on it — match whole
    // action names instead so searching "LOGIN" or "archive" finds those events.
    const matchedActions = Object.values(AUDIT_LEVEL_ACTIONS)
      .flat()
      .filter((action) => action.includes(search.trim().toUpperCase().replace(/\s+/g, "_")));

    where.OR = [
      { targetTable: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } }
          ]
        }
      }
    ];

    if (matchedActions.length > 0) {
      where.OR.push({ action: { in: matchedActions } });
    }
  }

  if (eventLevel && eventLevel !== 'All' && AUDIT_LEVEL_ACTIONS[eventLevel]) {
    where.action = { in: AUDIT_LEVEL_ACTIONS[eventLevel] };
  }

  if (category && category !== 'All' && AUDIT_CATEGORY_TABLES[category]) {
    where.targetTable = { in: AUDIT_CATEGORY_TABLES[category] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })
  ]);
  
  const mappedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    targetTable: log.targetTable,
    targetId: log.targetId,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
    user: log.user ? {
      name: `${log.user.firstName} ${log.user.lastName}`,
      email: log.user.email,
      role: log.user.role
    } : null
  }));

  return {
    data: mappedLogs,
    meta: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)),
    }
  };
};

const getAuditLogStats = async (query = {}) => {
  const { range } = query;
  // The same window the list uses, so a card can never contradict a row
  // sitting directly beneath it.
  const window = resolveAuditRange(range);

  // Counted in one round trip instead of four sequential ones, and reusing the
  // same level map as the list filter so the cards can't disagree with the rows.
  const [totalEvents, criticalEvents, warningEvents, adminActions] = await Promise.all([
    prisma.auditLog.count({ where: { ...window } }),
    prisma.auditLog.count({
      where: { ...window, action: { in: AUDIT_LEVEL_ACTIONS.Critical } }
    }),
    prisma.auditLog.count({
      where: { ...window, action: { in: AUDIT_LEVEL_ACTIONS.Warning } }
    }),
    prisma.auditLog.count({
      where: { ...window, user: { role: 'SYSTEM_ADMIN' } }
    }),
  ]);

  return {
    range: AUDIT_RANGES.includes(range) ? range : DEFAULT_AUDIT_RANGE,
    totalEvents,
    criticalEvents,
    warningEvents,
    adminActions,
    // Kept so an older client reading `totalEventsToday` does not render a
    // blank card against a newer server.
    totalEventsToday: totalEvents,
  };
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  createBed,
  getBeds,
  updateBed,
  getUserStats,
  getBedStats,
  getAuditLogs,
  getAuditLogStats
};
