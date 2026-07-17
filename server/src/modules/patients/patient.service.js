const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const createPatient = async (req, data) => {
  const existing = await prisma.patient.findUnique({
    where: { mrn: data.mrn }
  });
  if (existing) {
    throw new APIError("MRN already exists", 409);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "Patient" }, async (tx) => {
    const patient = await tx.patient.create({
      data: {
        mrn: data.mrn,
        nationalId: data.national_id || null,
        name: data.name,
        age: data.age,
        gender: data.gender || null,
        residence: data.residence || null,
        occupation: data.occupation || null,
        maritalStatus: data.marital_status || null,
        handedness: data.handedness || null,
      }
    });

    return {
      targetId: patient.id,
      newValues: patient,
      result: {
        id: patient.id,
        mrn: patient.mrn,
        national_id: patient.nationalId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        residence: patient.residence,
        occupation: patient.occupation,
        marital_status: patient.maritalStatus,
        handedness: patient.handedness,
        is_archived: patient.isArchived,
        archived_at: patient.archivedAt,
        created_at: patient.createdAt,
        updated_at: patient.updatedAt
      }
    };
  });
};

const getPatients = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where = {};
  if (query.mrn) {
    where.mrn = { contains: query.mrn, mode: "insensitive" };
  }
  if (query.name) {
    where.name = { contains: query.name, mode: "insensitive" };
  }
  if (query.include_archived !== "true") {
    where.isArchived = false;
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.patient.count({ where })
  ]);

  return {
    data: patients.map(p => ({
      id: p.id,
      mrn: p.mrn,
      national_id: p.nationalId,
      name: p.name,
      age: p.age,
      gender: p.gender,
      residence: p.residence,
      occupation: p.occupation,
      marital_status: p.maritalStatus,
      handedness: p.handedness,
      is_archived: p.isArchived,
      archived_at: p.archivedAt,
      created_at: p.createdAt,
      updated_at: p.updatedAt
    })),
    meta: {
      total,
      page,
      limit
    }
  };
};

const getPatientById = async (id) => {
  const p = await prisma.patient.findUnique({
    where: { id }
  });
  if (!p) {
    throw new APIError("Patient not found", 404);
  }

  return {
    id: p.id,
    mrn: p.mrn,
    national_id: p.nationalId,
    name: p.name,
    age: p.age,
    gender: p.gender,
    residence: p.residence,
    occupation: p.occupation,
    marital_status: p.maritalStatus,
    handedness: p.handedness,
    is_archived: p.isArchived,
    archived_at: p.archivedAt,
    created_at: p.createdAt,
    updated_at: p.updatedAt
  };
};

const deletePatient = async (req, id) => {
  const p = await prisma.patient.findUnique({ where: { id } });
  if (!p || p.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "Patient" }, async (tx) => {
    const archived = await tx.patient.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      }
    });

    return {
      targetId: id,
      oldValues: { isArchived: false, archivedAt: null },
      newValues: { isArchived: true, archivedAt: archived.archivedAt },
      result: true
    };
  });
};

const createAllergy = async (req, patientId, data) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "Allergy" }, async (tx) => {
    const allergy = await tx.allergy.create({
      data: {
        patientId,
        allergen: data.allergen,
        severity: data.severity || null
      }
    });

    return {
      targetId: allergy.id,
      newValues: allergy,
      result: {
        id: allergy.id,
        patient_id: allergy.patientId,
        allergen: allergy.allergen,
        severity: allergy.severity,
        is_archived: allergy.isArchived,
        archived_at: allergy.archivedAt,
        created_at: allergy.createdAt,
        updated_at: allergy.updatedAt
      }
    };
  });
};

const getAllergies = async (patientId) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  const allergies = await prisma.allergy.findMany({
    where: { patientId, isArchived: false }
  });

  return allergies.map(a => ({
    id: a.id,
    patient_id: a.patientId,
    allergen: a.allergen,
    severity: a.severity,
    is_archived: a.isArchived,
    archived_at: a.archivedAt,
    created_at: a.createdAt,
    updated_at: a.updatedAt
  }));
};

const deleteAllergy = async (req, id) => {
  const allergy = await prisma.allergy.findUnique({ where: { id } });
  if (!allergy || allergy.isArchived) {
    throw new APIError("Allergy not found", 404);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "Allergy" }, async (tx) => {
    const archived = await tx.allergy.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      }
    });

    return {
      targetId: id,
      oldValues: { isArchived: false, archivedAt: null },
      newValues: { isArchived: true, archivedAt: archived.archivedAt },
      result: true
    };
  });
};

const createMedicalHistory = async (req, patientId, data) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  const existing = await prisma.medicalHistory.findUnique({
    where: { patientId }
  });
  if (existing) {
    throw new APIError("Medical history already exists for this patient", 409);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "MedicalHistory" }, async (tx) => {
    const history = await tx.medicalHistory.create({
      data: {
        patientId,
        diabetesDm: data.diabetes_dm ?? false,
        hypertensionHtn: data.hypertension_htn ?? false,
        pastSimilarConditions: data.past_similar_conditions || null,
        pastDiseases: data.past_diseases || null,
        previousOperations: data.previous_operations ?? false,
        operationsDetails: data.operations_details || null,
        hasAllergies: data.has_allergies ?? false,
        traveledAbroad: data.traveled_abroad ?? false,
        consanguinity: data.consanguinity ?? false,
        familySimilarConditions: data.family_similar_conditions || null,
        inheritedDiseases: data.inherited_diseases || null
      }
    });

    return {
      targetId: history.id,
      newValues: history,
      result: {
        id: history.id,
        patient_id: history.patientId,
        diabetes_dm: history.diabetesDm,
        hypertension_htn: history.hypertensionHtn,
        past_similar_conditions: history.pastSimilarConditions,
        past_diseases: history.pastDiseases,
        previous_operations: history.previousOperations,
        operations_details: history.operationsDetails,
        has_allergies: history.hasAllergies,
        traveled_abroad: history.traveledAbroad,
        consanguinity: history.consanguinity,
        family_similar_conditions: history.familySimilarConditions,
        inherited_diseases: history.inheritedDiseases,
        created_at: history.createdAt,
        updated_at: history.updatedAt
      }
    };
  });
};

const getMedicalHistory = async (patientId) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  const history = await prisma.medicalHistory.findUnique({
    where: { patientId }
  });
  if (!history) {
    throw new APIError("Medical history not found", 404);
  }

  return {
    id: history.id,
    patient_id: history.patientId,
    diabetes_dm: history.diabetesDm,
    hypertension_htn: history.hypertensionHtn,
    past_similar_conditions: history.pastSimilarConditions,
    past_diseases: history.pastDiseases,
    previous_operations: history.previousOperations,
    operations_details: history.operationsDetails,
    has_allergies: history.hasAllergies,
    traveled_abroad: history.traveledAbroad,
    consanguinity: history.consanguinity,
    family_similar_conditions: history.familySimilarConditions,
    inherited_diseases: history.inheritedDiseases,
    created_at: history.createdAt,
    updated_at: history.updatedAt
  };
};

const updateMedicalHistory = async (req, patientId, data) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.isArchived) {
    throw new APIError("Patient not found", 404);
  }

  const existing = await prisma.medicalHistory.findUnique({
    where: { patientId }
  });
  if (!existing) {
    throw new APIError("Medical history not found", 404);
  }

  const updateData = {};
  if (data.diabetes_dm !== undefined) updateData.diabetesDm = data.diabetes_dm;
  if (data.hypertension_htn !== undefined) updateData.hypertensionHtn = data.hypertension_htn;
  if (data.past_similar_conditions !== undefined) updateData.pastSimilarConditions = data.past_similar_conditions;
  if (data.past_diseases !== undefined) updateData.pastDiseases = data.past_diseases;
  if (data.previous_operations !== undefined) updateData.previousOperations = data.previous_operations;
  if (data.operations_details !== undefined) updateData.operationsDetails = data.operations_details;
  if (data.has_allergies !== undefined) updateData.hasAllergies = data.has_allergies;
  if (data.traveled_abroad !== undefined) updateData.traveledAbroad = data.traveled_abroad;
  if (data.consanguinity !== undefined) updateData.consanguinity = data.consanguinity;
  if (data.family_similar_conditions !== undefined) updateData.familySimilarConditions = data.family_similar_conditions;
  if (data.inherited_diseases !== undefined) updateData.inheritedDiseases = data.inherited_diseases;

  return auditedTransaction(req, { action: "UPDATE", targetTable: "MedicalHistory" }, async (tx) => {
    const updated = await tx.medicalHistory.update({
      where: { patientId },
      data: updateData
    });

    return {
      targetId: existing.id,
      oldValues: existing,
      newValues: updated,
      result: {
        id: updated.id,
        patient_id: updated.patientId,
        diabetes_dm: updated.diabetesDm,
        hypertension_htn: updated.hypertensionHtn,
        past_similar_conditions: updated.pastSimilarConditions,
        past_diseases: updated.pastDiseases,
        previous_operations: updated.previousOperations,
        operations_details: updated.operationsDetails,
        has_allergies: updated.hasAllergies,
        traveled_abroad: updated.traveledAbroad,
        consanguinity: updated.consanguinity,
        family_similar_conditions: updated.familySimilarConditions,
        inherited_diseases: updated.inheritedDiseases,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt
      }
    };
  });
};

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  deletePatient,
  createAllergy,
  getAllergies,
  deleteAllergy,
  createMedicalHistory,
  getMedicalHistory,
  updateMedicalHistory
};
