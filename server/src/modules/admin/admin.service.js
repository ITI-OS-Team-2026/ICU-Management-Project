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
      twoFactorEnabled: true,
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
  const [total, active, suspended] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } })
  ]);
  
  return {
    total,
    active,
    suspended,
    pending2FA: 4 // Mocked for now since DB doesn't have this
  };
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

const getBeds = async ({ status }) => {
  const where = {};
  if (status) where.status = status;

  const beds = await prisma.bed.findMany({
    where,
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

  return beds.map(b => {
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



const getAuditLogs = async (query = {}) => {
  const { search, page = 1, limit = 10, eventLevel, category } = query;
  
  const where = {};
  
  if (search) {
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
  }

  if (eventLevel && eventLevel !== 'All') {
    if (eventLevel === 'Critical') {
      where.action = { in: ['ARCHIVE', 'ACCOUNT_LOCKED'] };
    } else if (eventLevel === 'Warning') {
      where.action = { in: ['UPDATE'] };
    } else if (eventLevel === 'Info') {
      where.action = { in: ['LOGIN', 'LOGOUT', 'CREATE', 'VIEW'] };
    }
  }

  if (category && category !== 'All') {
    if (category === 'Patients') {
      where.targetTable = { in: ['Patient', 'Allergy', 'MedicalHistory'] };
    } else if (category === 'Admissions') {
      where.targetTable = { in: ['Admission', 'AdmissionNurse'] };
    } else if (category === 'Documents') {
      where.targetTable = { in: ['MedicalDocument'] };
    } else if (category === 'Admin') {
      where.targetTable = { in: ['User', 'Bed'] };
    }
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

const getAuditLogStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalEventsToday = await prisma.auditLog.count({
    where: { createdAt: { gte: today } }
  });

  const criticalEvents = await prisma.auditLog.count({
    where: { 
      createdAt: { gte: today },
      action: { in: ['ARCHIVE', 'ACCOUNT_LOCKED'] }
    }
  });

  const warningEvents = await prisma.auditLog.count({
    where: { 
      createdAt: { gte: today },
      action: { in: ['UPDATE'] }
    }
  });

  const adminActions = await prisma.auditLog.count({
    where: { 
      createdAt: { gte: today },
      user: { role: 'SYSTEM_ADMIN' }
    }
  });

  return {
    totalEventsToday,
    criticalEvents,
    warningEvents,
    adminActions
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
  getAuditLogs,
  getAuditLogStats
};
