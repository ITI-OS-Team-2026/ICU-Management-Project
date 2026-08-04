const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const { auditedTransaction } = require("../../middlewares/auditLog");
const notificationService = require("../notifications/notification.service");
const { buildMarRow } = require("./medication.schedule");

// Fields the audit trail should carry for a medication order. Keeping this in
// one place stops the old/new value pairs from drifting apart.
const auditableFields = (med) => ({
  drugName: med.drugName,
  dosage: med.dosage,
  frequency: med.frequency,
  frequencyText: med.frequencyText,
  route: med.route,
  instructions: med.instructions,
  startDate: med.startDate,
  endDate: med.endDate,
  isActive: med.isActive,
});

const medicationInclude = {
  prescribedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  originalPrescriber: { select: { id: true, firstName: true, lastName: true, role: true } },
  discontinuedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  administrations: {
    where: { isArchived: false },
    orderBy: { scheduledTime: "asc" },
    include: {
      administeredBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  },
};

// =======================
// SAFETY CHECKS
// =======================

// Substring match in both directions so "Penicillin" on file catches an order
// for "Benzylpenicillin", and an allergy to "Penicillin V" catches "Penicillin".
const findAllergyConflicts = async (patientId, drugName, client = prisma) => {
  const allergies = await client.allergy.findMany({
    where: { patientId, isArchived: false },
  });

  const drug = drugName.trim().toLowerCase();
  return allergies.filter((allergy) => {
    const allergen = allergy.allergen.trim().toLowerCase();
    return drug.includes(allergen) || allergen.includes(drug);
  });
};

const findDuplicateOrders = async (admissionId, drugName, client = prisma, excludeId = null) => {
  const active = await client.medication.findMany({
    where: {
      admissionId,
      isActive: true,
      isArchived: false,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const drug = drugName.trim().toLowerCase();
  return active.filter((med) => med.drugName.trim().toLowerCase() === drug);
};

// Nurses currently assigned to the admission — the people who have to act on a
// new or cancelled order.
const notifyAssignedNurses = async (admissionId, { title, message, type = "ALERT", metadata }) => {
  try {
    const assignments = await prisma.admissionNurse.findMany({
      where: { admissionId, isArchived: false, unassignedAt: null },
      select: { nurseId: true },
    });

    await Promise.all(
      assignments.map((assignment) =>
        notificationService.createNotification({
          userId: assignment.nurseId,
          title,
          message,
          type,
          metadata,
        })
      )
    );
  } catch (err) {
    // A failed notification must never roll back or fail a clinical write —
    // the order itself is already committed and is the source of truth.
    logger.error(`Failed to notify nurses for admission ${admissionId}: ${err.message}`);
  }
};

// =======================
// PRESCRIPTIONS
// =======================

const prescribeMedication = async (req, admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: { patient: { select: { id: true, name: true } } },
  });
  if (!admission) throw new APIError("Admission not found", 404);
  if (admission.status !== "ACTIVE") throw new APIError("Cannot prescribe for an inactive admission", 409);

  const conflicts = await findAllergyConflicts(admission.patientId, data.drug_name);
  if (conflicts.length > 0 && !data.acknowledge_allergy) {
    throw new APIError(
      `${data.drug_name} conflicts with a documented allergy: ${conflicts
        .map((c) => (c.severity ? `${c.allergen} (${c.severity})` : c.allergen))
        .join(", ")}. Re-submit with acknowledge_allergy to override.`,
      409
    );
  }

  const duplicates = await findDuplicateOrders(admissionId, data.drug_name);

  const medication = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "Medication" },
    async (tx) => {
      const created = await tx.medication.create({
        data: {
          admissionId,
          prescribedById: userId,
          originalPrescriberId: userId,
          drugName: data.drug_name,
          dosage: data.dosage,
          frequency: data.frequency,
          frequencyText: data.frequency === "OTHER" ? data.frequency_text : null,
          route: data.route,
          instructions: data.instructions,
          allergyAcknowledged: conflicts.length > 0,
          startDate: data.start_date ? new Date(data.start_date) : undefined,
          endDate: data.end_date ? new Date(data.end_date) : undefined,
        },
        include: medicationInclude,
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        newValues: {
          ...auditableFields(created),
          allergyAcknowledged: created.allergyAcknowledged,
          allergyConflicts: conflicts.map((c) => c.allergen),
        },
      };
    }
  );

  await notifyAssignedNurses(admissionId, {
    title: "New medication order",
    message: `${medication.drugName} ${medication.dosage} ${medication.frequency} for ${admission.patient?.name}.`,
    metadata: { admissionId, medicationId: medication.id, link: "/medications/administration" },
  });

  return {
    ...medication,
    duplicateWarning: duplicates.length > 0 ? duplicates.map((d) => d.id) : undefined,
  };
};

const getMedications = async (admissionId, query) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission) throw new APIError("Admission not found", 404);

  const where = { admissionId, isArchived: false };
  if (query.is_active !== undefined) {
    where.isActive = query.is_active === "true";
  }

  return await prisma.medication.findMany({
    where,
    orderBy: { prescribedAt: "desc" },
    include: medicationInclude,
  });
};

/**
 * The Medication Administration Record for one admission on one day: every
 * active order expanded into its due dose slots with live status.
 */
const getMar = async (admissionId, query) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: {
      patient: { select: { id: true, name: true, mrn: true, age: true, gender: true } },
      bed: { select: { id: true, bedNumber: true } },
    },
  });
  if (!admission) throw new APIError("Admission not found", 404);

  const day = query.date ? new Date(query.date) : new Date();
  if (Number.isNaN(day.getTime())) throw new APIError("Invalid date", 400);

  const medications = await prisma.medication.findMany({
    where: { admissionId, isArchived: false, isActive: true },
    orderBy: { prescribedAt: "desc" },
    include: medicationInclude,
  });

  const rows = medications.map((med) => buildMarRow(med, day));

  return {
    admission: {
      id: admission.id,
      patient: admission.patient,
      bed: admission.bed,
    },
    date: day.toISOString().slice(0, 10),
    medications: rows,
    summary: rows.reduce(
      (acc, row) => ({
        total: acc.total + row.summary.total,
        administered: acc.administered + row.summary.administered,
        missed: acc.missed + row.summary.missed,
        due: acc.due + row.summary.due,
      }),
      { total: 0, administered: 0, missed: 0, due: 0 }
    ),
  };
};

// Amending an order archives the old row and writes a new one, so the history a
// nurse acted on is never rewritten underneath them.
const updateMedication = async (req, id, data, userId) => {
  const existing = await prisma.medication.findUnique({
    where: { id },
    include: { admission: { select: { id: true, patientId: true } } },
  });
  if (!existing || existing.isArchived) throw new APIError("Medication order not found", 404);

  const nextDrugName = data.drug_name !== undefined ? data.drug_name : existing.drugName;

  if (data.drug_name !== undefined && data.drug_name !== existing.drugName) {
    const conflicts = await findAllergyConflicts(existing.admission.patientId, nextDrugName);
    if (conflicts.length > 0 && !data.acknowledge_allergy) {
      throw new APIError(
        `${nextDrugName} conflicts with a documented allergy: ${conflicts
          .map((c) => c.allergen)
          .join(", ")}. Re-submit with acknowledge_allergy to override.`,
        409
      );
    }
  }

  const updated = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "Medication" },
    async (tx) => {
      await tx.medication.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      });

      const nextFrequency = data.frequency !== undefined ? data.frequency : existing.frequency;

      // Administrations stay attached to the archived order they were logged
      // against; re-pointing them would falsify what the nurse actually gave.
      const created = await tx.medication.create({
        data: {
          admissionId: existing.admissionId,
          prescribedById: userId, // whoever made the change owns the new version
          originalPrescriberId: existing.originalPrescriberId || existing.prescribedById,
          drugName: nextDrugName,
          dosage: data.dosage !== undefined ? data.dosage : existing.dosage,
          frequency: nextFrequency,
          frequencyText:
            nextFrequency === "OTHER"
              ? data.frequency_text !== undefined
                ? data.frequency_text
                : existing.frequencyText
              : null,
          route: data.route !== undefined ? data.route : existing.route,
          instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
          allergyAcknowledged: data.acknowledge_allergy ? true : existing.allergyAcknowledged,
          startDate:
            data.start_date !== undefined
              ? data.start_date
                ? new Date(data.start_date)
                : null
              : existing.startDate,
          endDate:
            data.end_date !== undefined
              ? data.end_date
                ? new Date(data.end_date)
                : null
              : existing.endDate,
          isActive: data.is_active !== undefined ? data.is_active : existing.isActive,
        },
        include: medicationInclude,
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        oldValues: { id: existing.id, ...auditableFields(existing) },
        newValues: { id: created.id, ...auditableFields(created) },
      };
    }
  );

  await notifyAssignedNurses(existing.admissionId, {
    title: "Medication order changed",
    message: `${updated.drugName} order updated — ${updated.dosage} ${updated.frequency}. Review before the next dose.`,
    metadata: {
      admissionId: existing.admissionId,
      medicationId: updated.id,
      link: "/medications/administration",
    },
  });

  return updated;
};

const discontinueMedication = async (req, id, data, userId) => {
  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Medication order not found", 404);

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "Medication" }, async (tx) => {
    const updated = await tx.medication.update({
      where: { id },
      data: {
        // Deliberately not isArchived: a discontinued order must stay visible
        // in the patient's record rather than vanish from the history.
        isActive: false,
        discontinuedById: userId,
        discontinuedAt: new Date(),
        discontinueReason: data.discontinue_reason,
      },
    });

    return {
      result: updated,
      targetId: id,
      userId,
      oldValues: auditableFields(existing),
      newValues: { isActive: false, discontinueReason: data.discontinue_reason },
    };
  });

  await notifyAssignedNurses(existing.admissionId, {
    title: "Medication discontinued",
    message: `${existing.drugName} has been discontinued — ${data.discontinue_reason}. Do not administer.`,
    metadata: { admissionId: existing.admissionId, medicationId: id, link: "/medications/administration" },
  });
};

// =======================
// ADMINISTRATIONS (eMAR)
// =======================

const logAdministration = async (req, medicationId, data, userId) => {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication || medication.isArchived) throw new APIError("Medication order not found", 404);
  if (!medication.isActive) throw new APIError("Cannot administer a discontinued medication", 409);

  const scheduledTime = new Date(data.scheduled_time);

  // One live log per slot — a second tap on the same slot is a correction, and
  // corrections go through updateAdministration so they leave a reason behind.
  const duplicate = await prisma.medicationAdministration.findFirst({
    where: { medicationId, isArchived: false, scheduledTime },
  });
  if (duplicate) {
    throw new APIError("This dose has already been recorded. Edit the existing entry instead.", 409);
  }

  return await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "MedicationAdministration" },
    async (tx) => {
      const created = await tx.medicationAdministration.create({
        data: {
          medicationId,
          administeredById: userId,
          status: data.status,
          administeredDose: data.administered_dose,
          notes: data.notes,
          scheduledTime,
          administeredAt: data.administered_at ? new Date(data.administered_at) : new Date(),
        },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        newValues: {
          medicationId,
          drugName: medication.drugName,
          status: created.status,
          administeredDose: created.administeredDose,
          scheduledTime: created.scheduledTime,
          notes: created.notes,
        },
      };
    }
  );
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

const updateAdministration = async (req, id, data, userId) => {
  const existing = await prisma.medicationAdministration.findUnique({
    where: { id },
    include: { medication: { select: { drugName: true } } },
  });
  if (!existing || existing.isArchived) throw new APIError("Administration log not found", 404);

  return await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "MedicationAdministration" },
    async (tx) => {
      await tx.medicationAdministration.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      });

      const newNotes = `[Corrected: ${data.modification_reason}] ${
        data.notes !== undefined ? data.notes : existing.notes || ""
      }`.trim();

      const created = await tx.medicationAdministration.create({
        data: {
          medicationId: existing.medicationId,
          administeredById: userId, // nurse or doctor making the correction
          status: data.status !== undefined ? data.status : existing.status,
          administeredDose:
            data.administered_dose !== undefined ? data.administered_dose : existing.administeredDose,
          notes: newNotes,
          scheduledTime:
            data.scheduled_time !== undefined ? new Date(data.scheduled_time) : existing.scheduledTime,
          administeredAt:
            data.administered_at !== undefined ? new Date(data.administered_at) : existing.administeredAt,
        },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        oldValues: {
          id: existing.id,
          status: existing.status,
          administeredDose: existing.administeredDose,
          notes: existing.notes,
          scheduledTime: existing.scheduledTime,
        },
        newValues: {
          id: created.id,
          drugName: existing.medication?.drugName,
          status: created.status,
          administeredDose: created.administeredDose,
          notes: created.notes,
          scheduledTime: created.scheduledTime,
          modificationReason: data.modification_reason,
        },
      };
    }
  );
};

const deleteAdministration = async (req, id, userId) => {
  const existing = await prisma.medicationAdministration.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Administration log not found", 404);

  await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "MedicationAdministration" },
    async (tx) => {
      const updated = await tx.medicationAdministration.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      });

      return {
        result: updated,
        targetId: id,
        userId,
        oldValues: { status: existing.status, scheduledTime: existing.scheduledTime },
      };
    }
  );
};

module.exports = {
  findAllergyConflicts,
  findDuplicateOrders,
  prescribeMedication,
  getMedications,
  getMar,
  updateMedication,
  discontinueMedication,
  logAdministration,
  getAdministrations,
  updateAdministration,
  deleteAdministration,
};
