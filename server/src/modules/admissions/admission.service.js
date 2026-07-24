const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const formatAdmission = (a) => ({
  id: a.id,
  patient_id: a.patientId,
  bed_id: a.bedId,
  doctor_id: a.doctorId,
  admission_reason: a.admissionReason,
  place_of_transfer: a.placeOfTransfer,
  transfer_doctor_name: a.transferDoctorName,
  chief_complaint: a.chiefComplaint,
  symptoms_related_system: a.symptomsRelatedSystem,
  symptoms_other_systems: a.symptomsOtherSystems,
  previous_investigations: a.previousInvestigations,
  previous_treatments: a.previousTreatments,
  provisional_diagnosis: a.provisionalDiagnosis,
  status: a.status,
  admitted_at: a.admittedAt,
  discharged_at: a.dischargedAt,
  is_archived: a.isArchived,
  archived_at: a.archivedAt,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
  patient: a.patient ? {
    id: a.patient.id,
    mrn: a.patient.mrn,
    name: a.patient.name,
    age: a.patient.age,
    gender: a.patient.gender,
  } : null,
  bed: a.bed ? {
    id: a.bed.id,
    bed_number: a.bed.bedNumber,
    status: a.bed.status,
  } : null,
});

const formatNurseAssignment = (n) => ({
  id: n.id,
  admission_id: n.admissionId,
  nurse_id: n.nurseId,
  assigned_at: n.assignedAt,
  unassigned_at: n.unassignedAt,
  is_archived: n.isArchived,
  archived_at: n.archivedAt,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
  ...(n.nurse
    ? {
        nurse: {
          id: n.nurse.id,
          first_name: n.nurse.firstName,
          last_name: n.nurse.lastName,
          email: n.nurse.email,
          role: n.nurse.role,
        },
      }
    : {}),
});

const createAdmission = async (req, data) => {
  const patient = await prisma.patient.findUnique({ where: { id: data.patient_id } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  const bed = await prisma.bed.findUnique({ where: { id: data.bed_id } });
  if (!bed) {
    throw new APIError("Bed not found", 404);
  }
  if (bed.status !== "AVAILABLE") {
    throw new APIError("Bed is not available", 409);
  }

  const doctor = await prisma.user.findUnique({ where: { id: data.doctor_id } });
  if (!doctor || doctor.status !== "ACTIVE") {
    throw new APIError("Doctor not found", 404);
  }
  if (doctor.role !== "ICU_SPECIALIST") {
    throw new APIError("Attending doctor must be an ICU specialist", 400);
  }

  const activeOnBed = await prisma.admission.findFirst({
    where: { bedId: data.bed_id, status: "ACTIVE" },
  });
  if (activeOnBed) {
    throw new APIError("Bed already has an active admission", 409);
  }

  try {
    return await auditedTransaction(req, { action: "CREATE", targetTable: "Admission" }, async (tx) => {
      const admission = await tx.admission.create({
        data: {
          patientId: data.patient_id,
          bedId: data.bed_id,
          doctorId: data.doctor_id,
          admissionReason: data.admission_reason || null,
          placeOfTransfer: data.place_of_transfer || null,
          transferDoctorName: data.transfer_doctor_name || null,
          chiefComplaint: data.chief_complaint || null,
          symptomsRelatedSystem: data.symptoms_related_system || null,
          symptomsOtherSystems: data.symptoms_other_systems || null,
          previousInvestigations: data.previous_investigations || null,
          previousTreatments: data.previous_treatments || null,
          provisionalDiagnosis: data.provisional_diagnosis || null,
          status: "ACTIVE",
        },
      });

      await tx.bed.update({
        where: { id: data.bed_id },
        data: { status: "OCCUPIED" },
      });

      return {
        targetId: admission.id,
        newValues: admission,
        result: formatAdmission(admission),
      };
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new APIError("Bed already has an active admission", 409);
    }
    throw error;
  }
};

const getAdmissions = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where = { isArchived: false };
  if (query.status) where.status = query.status;
  if (query.bed_id) where.bedId = query.bed_id;

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { admittedAt: "desc" },
      include: {
        patient: true,
        bed: true,
      },
    }),
    prisma.admission.count({ where }),
  ]);

  return {
    data: admissions.map(formatAdmission),
    meta: { total, page, limit },
  };
};

const getAdmissionById = async (id) => {
  const admission = await prisma.admission.findUnique({
    where: { id },
    include: {
      patient: true,
      bed: true,
    },
  });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }
  return formatAdmission(admission);
};

const dischargeAdmission = async (req, id) => {
  const admission = await prisma.admission.findUnique({ where: { id } });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }
  if (admission.status !== "ACTIVE") {
    throw new APIError("Admission is not active", 409);
  }

  return auditedTransaction(req, { action: "UPDATE", targetTable: "Admission" }, async (tx) => {
    const dischargedAt = new Date();
    const updated = await tx.admission.update({
      where: { id },
      data: {
        status: "DISCHARGED",
        dischargedAt,
      },
    });

    await tx.bed.update({
      where: { id: admission.bedId },
      data: { status: "AVAILABLE" },
    });

    return {
      targetId: id,
      oldValues: { status: admission.status, dischargedAt: admission.dischargedAt },
      newValues: { status: "DISCHARGED", dischargedAt },
      result: formatAdmission(updated),
    };
  });
};

const archiveAdmission = async (req, id) => {
  const admission = await prisma.admission.findUnique({ where: { id } });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "Admission" }, async (tx) => {
    const archivedAt = new Date();
    const updateData = {
      isArchived: true,
      archivedAt,
      status: "ARCHIVED",
    };

    if (admission.status === "ACTIVE") {
      updateData.dischargedAt = admission.dischargedAt || archivedAt;
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" },
      });
    }

    await tx.admission.update({
      where: { id },
      data: updateData,
    });

    return {
      targetId: id,
      oldValues: {
        isArchived: false,
        status: admission.status,
        archivedAt: null,
      },
      newValues: {
        isArchived: true,
        status: "ARCHIVED",
        archivedAt,
      },
      result: true,
    };
  });
};

const assignNurse = async (req, admissionId, data) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }
  if (admission.status !== "ACTIVE") {
    throw new APIError("Admission is not active", 409);
  }

  if (req.user.role === "ICU_NURSE" && data.nurse_id !== req.user.id) {
    throw new APIError("Nurses can only assign themselves", 403);
  }

  const nurse = await prisma.user.findUnique({ where: { id: data.nurse_id } });
  if (!nurse || nurse.status !== "ACTIVE") {
    throw new APIError("Nurse not found", 404);
  }
  if (nurse.role !== "ICU_NURSE") {
    throw new APIError("User must be an ICU nurse", 400);
  }

  const activeAssignment = await prisma.admissionNurse.findFirst({
    where: {
      admissionId,
      nurseId: data.nurse_id,
      unassignedAt: null,
      isArchived: false,
    },
  });
  if (activeAssignment) {
    throw new APIError("Nurse is already assigned to this admission", 409);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "AdmissionNurse" }, async (tx) => {
    const assignment = await tx.admissionNurse.create({
      data: {
        admissionId,
        nurseId: data.nurse_id,
      },
      include: {
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      targetId: assignment.id,
      newValues: assignment,
      result: formatNurseAssignment(assignment),
    };
  });
};

const getAdmissionNurses = async (admissionId) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  const assignments = await prisma.admissionNurse.findMany({
    where: { admissionId, isArchived: false },
    include: {
      nurse: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return assignments.map(formatNurseAssignment);
};

const unassignNurse = async (req, admissionId, nurseId) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  if (req.user.role === "ICU_NURSE" && nurseId !== req.user.id) {
    throw new APIError("Nurses can only unassign themselves", 403);
  }

  const assignment = await prisma.admissionNurse.findFirst({
    where: {
      admissionId,
      nurseId,
      unassignedAt: null,
      isArchived: false,
    },
  });
  if (!assignment) {
    throw new APIError("Active nurse assignment not found", 404);
  }

  return auditedTransaction(req, { action: "UPDATE", targetTable: "AdmissionNurse" }, async (tx) => {
    const unassignedAt = new Date();
    await tx.admissionNurse.update({
      where: { id: assignment.id },
      data: { unassignedAt },
    });

    return {
      targetId: assignment.id,
      oldValues: { unassignedAt: null },
      newValues: { unassignedAt },
      result: true,
    };
  });
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  dischargeAdmission,
  archiveAdmission,
  assignNurse,
  getAdmissionNurses,
  unassignNurse,
};
