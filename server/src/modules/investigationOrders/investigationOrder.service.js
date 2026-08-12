const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const createInvestigationOrder = async (req, admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot order investigations for an inactive admission", 409);
  }

  return await auditedTransaction(req, { action: "CREATE", targetTable: "InvestigationOrder" }, async (tx) => {
    const result = await tx.investigationOrder.create({
      data: {
        admissionId: admission.id,
        orderedById: userId,
        orderName: data.order_name,
        type: data.type,
        status: "Pending",
        orderDate: data.order_date ? new Date(data.order_date) : new Date(),
      },
    });

    return {
      result,
      targetId: result.id,
      userId,
      newValues: {
        orderName: result.orderName,
        type: result.type,
        status: result.status,
      }
    };
  });
};

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

const updateInvestigationOrder = async (req, id, data, userId) => {
  const existing = await prisma.investigationOrder.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new APIError("Investigation order not found", 404);
  }

  return await auditedTransaction(req, { action: "UPDATE", targetTable: "InvestigationOrder" }, async (tx) => {
    const result = await tx.investigationOrder.update({
      where: { id },
      data: { status: data.status },
      include: {
        orderedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return {
      result,
      targetId: id,
      userId,
      oldValues: {
        status: existing.status,
      },
      newValues: {
        status: result.status,
      }
    };
  });
};

module.exports = {
  createInvestigationOrder,
  getInvestigationOrders,
  updateInvestigationOrder,
};
