const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

// POST — place an investigation order on an admission.
// Only allowed while the admission is ACTIVE (same guard as diagnoses/medications).
const createInvestigationOrder = async (admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot order investigations for an inactive admission", 409);
  }

  return prisma.investigationOrder.create({
    data: {
      admissionId: admission.id,
      orderedById: userId,
      orderName: data.order_name,
      type: data.type,
      status: "Pending",
    },
  });
};

// GET — list all investigation orders for an admission.
const getInvestigationOrders = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  return prisma.investigationOrder.findMany({
    where: { admissionId },
    include: {
      orderedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
    orderBy: { orderDate: "desc" },
  });
};

// PATCH — update the status of an investigation order.
const updateInvestigationOrder = async (id, data) => {
  const existing = await prisma.investigationOrder.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new APIError("Investigation order not found", 404);
  }

  return prisma.investigationOrder.update({
    where: { id },
    data: { status: data.status },
    include: {
      orderedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
};

module.exports = {
  createInvestigationOrder,
  getInvestigationOrders,
  updateInvestigationOrder,
};
