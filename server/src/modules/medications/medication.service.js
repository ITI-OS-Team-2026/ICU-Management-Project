const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

// =======================
// PRESCRIPTIONS
// =======================

const prescribeMedication = async (admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission) throw new APIError("Admission not found", 404);
  if (admission.status !== "ACTIVE") throw new APIError("Cannot prescribe for an inactive admission", 409);

  return await prisma.medication.create({
    data: {
      admissionId,
      prescribedById: userId,
      drugName: data.drug_name,
      dosage: data.dosage,
      frequency: data.frequency,
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      endDate: data.end_date ? new Date(data.end_date) : undefined,
    },
  });
};

const getMedications = async (admissionId, query) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission) throw new APIError("Admission not found", 404);

  const where = { admissionId, isArchived: false };
  if (query.is_active !== undefined) {
    where.isActive = query.is_active === 'true';
  }

  return await prisma.medication.findMany({
    where,
    orderBy: { prescribedAt: "desc" },
    include: {
      prescribedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
};

const updateMedication = async (id, data, userId) => {
  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Medication order not found", 404);

  return await prisma.$transaction(async (tx) => {
    await tx.medication.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    return await tx.medication.create({
      data: {
        admissionId: existing.admissionId,
        prescribedById: userId, // Prescribed by whoever made the change
        drugName: data.drug_name !== undefined ? data.drug_name : existing.drugName,
        dosage: data.dosage !== undefined ? data.dosage : existing.dosage,
        frequency: data.frequency !== undefined ? data.frequency : existing.frequency,
        startDate: data.start_date !== undefined ? (data.start_date ? new Date(data.start_date) : null) : existing.startDate,
        endDate: data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : existing.endDate,
        isActive: data.is_active !== undefined ? data.is_active : existing.isActive,
      },
    });
  });
};

const deleteMedication = async (id) => {
  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Medication order not found", 404);

  await prisma.medication.update({
    where: { id },
    data: { isArchived: true, archivedAt: new Date(), isActive: false },
  });
};

// =======================
// ADMINISTRATIONS (eMAR)
// =======================

const logAdministration = async (medicationId, data, userId) => {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication || medication.isArchived) throw new APIError("Medication order not found", 404);
  if (!medication.isActive) throw new APIError("Cannot administer a discontinued medication", 409);

  return await prisma.medicationAdministration.create({
    data: {
      medicationId,
      administeredById: userId,
      status: data.status,
      administeredDose: data.administered_dose,
      notes: data.notes,
      scheduledTime: new Date(data.scheduled_time),
      administeredAt: data.administered_at ? new Date(data.administered_at) : new Date(),
    },
  });
};

const getAdministrations = async (medicationId) => {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication) throw new APIError("Medication order not found", 404);

  return await prisma.medicationAdministration.findMany({
    where: { medicationId, isArchived: false },
    orderBy: { scheduledTime: "asc" },
    include: {
      administeredBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
};

const updateAdministration = async (id, data, userId) => {
  const existing = await prisma.medicationAdministration.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Administration log not found", 404);

  return await prisma.$transaction(async (tx) => {
    await tx.medicationAdministration.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    const newNotes = data.modification_reason 
      ? `[Corrected by User ${userId}: ${data.modification_reason}] ${data.notes !== undefined ? data.notes : (existing.notes || "")}`
      : (data.notes !== undefined ? data.notes : existing.notes);

    return await tx.medicationAdministration.create({
      data: {
        medicationId: existing.medicationId,
        administeredById: userId, // Nurse or Doctor correcting it
        status: data.status !== undefined ? data.status : existing.status,
        administeredDose: data.administered_dose !== undefined ? data.administered_dose : existing.administeredDose,
        notes: newNotes,
        scheduledTime: data.scheduled_time !== undefined ? new Date(data.scheduled_time) : existing.scheduledTime,
        administeredAt: data.administered_at !== undefined ? new Date(data.administered_at) : existing.administeredAt,
      },
    });
  });
};

const deleteAdministration = async (id) => {
  const existing = await prisma.medicationAdministration.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Administration log not found", 404);

  await prisma.medicationAdministration.update({
    where: { id },
    data: { isArchived: true, archivedAt: new Date() },
  });
};

module.exports = {
  prescribeMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  logAdministration,
  getAdministrations,
  updateAdministration,
  deleteAdministration,
};
