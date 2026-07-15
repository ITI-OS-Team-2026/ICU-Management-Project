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
  return map[role];
};

const createUser = async (data) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() }
  });
  if (existingUser) {
    throw new APIError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  
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

const getUsers = async ({ role, status, page, limit }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  
  const where = {};
  if (role) where.role = mapRoleToPrisma(role);
  if (status) where.status = status;

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

  const beds = await prisma.bed.findMany({ where });
  return beds.map(b => ({
    id: b.id,
    bed_number: b.bedNumber,
    status: b.status
  }));
};

const updateBed = async (req, id, data) => {
  const bed = await prisma.bed.findUnique({ where: { id } });
  if (!bed) throw new APIError("Bed not found", 404);

  const updated = await prisma.bed.update({
    where: { id },
    data: { status: data.status }
  });

  return {
    id: updated.id,
    bed_number: updated.bedNumber,
    status: updated.status
  };
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createBed,
  getBeds,
  updateBed
};
