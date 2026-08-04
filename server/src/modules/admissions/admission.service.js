const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const formatAdmission = (a) => ({
  id: a.id,
  patient_id: a.patientId,
  bed_id: a.bedId,
  doctor_id: a.doctorId,
  transfer_reason: a.transferReason,
  place_of_transfer: a.placeOfTransfer,
  transfer_doctor_name: a.transferDoctorName,
  chief_complaint: a.chiefComplaint,
  symptoms_related_system: a.symptomsRelatedSystem,
  symptoms_other_systems: a.symptomsOtherSystems,
  complaint_analysis: a.complaintAnalysis,
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
    national_id: a.patient.nationalId,
    name: a.patient.name,
    age: a.patient.age,
    gender: a.patient.gender,
    residence: a.patient.residence,
    occupation: a.patient.occupation,
    marital_status: a.patient.maritalStatus,
    handedness: a.patient.handedness,
  } : null,
  bed: a.bed ? {
    id: a.bed.id,
    bed_number: a.bed.bedNumber,
    status: a.bed.status,
  } : null,
  doctor: a.doctor ? {
    id: a.doctor.id,
    first_name: a.doctor.firstName,
    last_name: a.doctor.lastName,
    email: a.doctor.email,
    role: a.doctor.role,
  } : null,
  nurses: a.nurses ? a.nurses.map(formatNurseAssignment) : [],
  latestVitals: a.vitalSigns && a.vitalSigns.length > 0 ? a.vitalSigns[0] : null,
  diagnosesList: a.diagnoses || [],
  // Only the queries that load the relation expose the key. Defaulting to []
  // instead would make "not requested" look identical to "none pending",
  // which is exactly the sort of thing that quietly zeroes a dashboard count.
  ...(a.investigationOrders ? { pendingInvestigations: a.investigationOrders } : {}),
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

const createFullAdmission = async (req, data) => {
  return await auditedTransaction(req, { action: "CREATE", targetTable: "Admission" }, async (tx) => {
    // 1. Check Bed Availability Early
    const bed = await tx.bed.findUnique({ where: { id: data.admission.bed_id } });
    if (!bed) throw new APIError("Bed not found", 404);
    if (bed.status !== "AVAILABLE") throw new APIError("Bed is not available", 409);

    const activeOnBed = await tx.admission.findFirst({
      where: { bedId: data.admission.bed_id, status: "ACTIVE" },
    });
    if (activeOnBed) throw new APIError("Bed already has an active admission", 409);

    const doctor = await tx.user.findUnique({ where: { id: data.admission.doctor_id } });
    if (!doctor || doctor.status !== "ACTIVE") throw new APIError("Doctor not found", 404);
    if (doctor.role !== "ICU_SPECIALIST") throw new APIError("Attending doctor must be an ICU specialist", 400);

    // 2. Upsert Patient
    const patientData = {
      mrn: data.patient.mrn,
      nationalId: data.patient.national_id || null,
      name: data.patient.name,
      age: data.patient.age,
      gender: data.patient.gender || null,
      residence: data.patient.residence || null,
      occupation: data.patient.occupation || null,
      maritalStatus: data.patient.marital_status || null,
      handedness: data.patient.handedness || null,
      childrenCount: data.patient.children_count ?? null,
      youngestChildAge: data.patient.youngest_child_age || null,
    };

    const patient = await tx.patient.upsert({
      where: { mrn: data.patient.mrn },
      update: patientData,
      create: patientData,
    });

    // A patient can only occupy one ICU bed. Without this the same MRN could be
    // admitted to two beds at once, splitting their vitals and drug chart
    // across two records.
    const patientAlreadyAdmitted = await tx.admission.findFirst({
      where: { patientId: patient.id, status: "ACTIVE" },
      include: { bed: { select: { bedNumber: true } } },
    });
    if (patientAlreadyAdmitted) {
      throw new APIError(
        `${patient.name} already has an active admission in bed ${patientAlreadyAdmitted.bed?.bedNumber || "unknown"}. Discharge that admission first.`,
        409
      );
    }

    // 3. Upsert Medical History (if provided)
    if (data.medical_history) {
      const mhData = {
        diabetesDm: data.medical_history.diabetes_dm ?? false,
        hypertensionHtn: data.medical_history.hypertension_htn ?? false,
        pastSimilarConditions: data.medical_history.past_similar_conditions || null,
        pastDiseases: data.medical_history.past_diseases || null,
        previousOperations: data.medical_history.previous_operations ?? false,
        hasAllergies: data.medical_history.has_allergies ?? false,
        traveledAbroad: data.medical_history.traveled_abroad ?? false,
        consanguinity: data.medical_history.consanguinity ?? false,
        familySimilarConditions: data.medical_history.family_similar_conditions || null,
        inheritedDiseases: data.medical_history.inherited_diseases || null,
        freeText: data.medical_history.free_text || null,
        customFields: data.medical_history.custom_fields || null,
        // Previously dropped on the floor: the client has always sent these,
        // the Joi schema has always accepted them, and the columns exist — but
        // they were never written, so Step 2's personal and female history was
        // silently lost on every admission.
        specialHabits: data.medical_history.special_habits || null,
        bloodTransfusion: data.medical_history.blood_transfusion ?? false,
        menstrualHistory: data.medical_history.menstrual_history || null,
        obstetricHistory: data.medical_history.obstetric_history || null,
      };

      await tx.medicalHistory.upsert({
        where: { patientId: patient.id },
        update: mhData,
        create: {
          patientId: patient.id,
          ...mhData
        },
      });
    }

    // 3b. Record the patient's allergies. These drive the prescribing safety
    // check, so an allergy captured here is what blocks a conflicting drug
    // order later.
    if (Array.isArray(data.allergies) && data.allergies.length > 0) {
      const existing = await tx.allergy.findMany({
        where: { patientId: patient.id, isArchived: false },
        select: { allergen: true },
      });
      const known = new Set(existing.map((a) => a.allergen.trim().toLowerCase()));

      const fresh = data.allergies.filter(
        (a) => !known.has(a.allergen.trim().toLowerCase())
      );

      if (fresh.length > 0) {
        await tx.allergy.createMany({
          data: fresh.map((a) => ({
            patientId: patient.id,
            allergen: a.allergen.trim(),
            severity: a.severity || null,
          })),
        });
      }
    }

    // 4. Create Admission
    const admission = await tx.admission.create({
      data: {
        patientId: patient.id,
        bedId: data.admission.bed_id,
        doctorId: data.admission.doctor_id,
        transferReason: data.admission.transfer_reason || null,
        placeOfTransfer: data.admission.place_of_transfer || null,
        transferDoctorName: data.admission.transfer_doctor_name || null,
        chiefComplaint: data.admission.chief_complaint || null,
        complaintAnalysis: data.admission.complaint_analysis || null,
        symptomsRelatedSystem: data.admission.symptoms_related_system || null,
        symptomsOtherSystems: data.admission.symptoms_other_systems || null,
        previousInvestigations: data.admission.previous_investigations || null,
        previousTreatments: data.admission.previous_treatments || null,
        provisionalDiagnosis: data.admission.provisional_diagnosis || null,
      },
      include: {
        patient: true,
        bed: true,
        doctor: true,
        nurses: {
          where: { isArchived: false },
          include: {
            nurse: true,
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        diagnoses: {
          where: { isArchived: false },
        },
      },
    });

    // 5. Create Vital Signs (if provided)
    if (data.vital_signs) {
      await tx.vitalSign.create({
        data: {
          admissionId: admission.id,
          temperature: data.vital_signs.temperature || null,
          pulse: data.vital_signs.pulse || null,
          systolicBp: data.vital_signs.systolic_bp || null,
          diastolicBp: data.vital_signs.diastolic_bp || null,
          respiratoryRate: data.vital_signs.respiratory_rate || null,
          spo2: data.vital_signs.spo2 || null,
          isOverride: data.vital_signs.is_override || false,
          overrideReason: data.vital_signs.override_reason || null,
          recordedById: req.user.id,
        },
      });
    }

    // 6. Create the provisional diagnoses (Step 6 of the admission form).
    // Only one condition can be PRIMARY; the client marks it, and anything
    // beyond the first is demoted so the problem list stays unambiguous.
    if (Array.isArray(data.diagnoses) && data.diagnoses.length > 0) {
      let primaryTaken = false;
      await tx.diagnosis.createMany({
        data: data.diagnoses.map((diag) => {
          const isPrimary = diag.type === "PRIMARY" && !primaryTaken;
          if (isPrimary) primaryTaken = true;

          return {
            admissionId: admission.id,
            conditionName: diag.condition_name,
            type: isPrimary ? "PRIMARY" : diag.type === "PRIMARY" ? "SECONDARY" : diag.type,
            status: diag.status || "SUSPECTED",
            clinicalNotes: diag.clinical_notes || null,
            onsetDate: diag.onset_date ? new Date(diag.onset_date) : null,
            diagnosedById: req.user.id,
            originalDiagnosedById: req.user.id,
          };
        }),
      });
    }

    // 7. Create initial medication orders (Step 8 of the admission form).
    // Written inside this transaction so an admission can never end up with a
    // partial drug list — either every order lands or the admission rolls back.
    if (Array.isArray(data.medications) && data.medications.length > 0) {
      await tx.medication.createMany({
        data: data.medications.map((med) => ({
          admissionId: admission.id,
          prescribedById: req.user.id,
          originalPrescriberId: req.user.id,
          drugName: med.drug_name,
          dosage: med.dosage,
          frequency: med.frequency,
          frequencyText: med.frequency === "OTHER" ? med.frequency_text : null,
          route: med.route,
          instructions: med.instructions || null,
          startDate: med.start_date ? new Date(med.start_date) : null,
          endDate: med.end_date ? new Date(med.end_date) : null,
        })),
      });
    }

    // 8. Create the investigation orders (Step 7). Previously these were POSTed
    // one at a time after the admission had already committed, so a failure
    // part-way left a live admission with an incomplete work-up.
    if (Array.isArray(data.investigations) && data.investigations.length > 0) {
      await tx.investigationOrder.createMany({
        data: data.investigations.map((inv) => ({
          admissionId: admission.id,
          orderedById: req.user.id,
          orderName: inv.order_name,
          type: inv.type || "Lab",
          ...(inv.order_date ? { orderDate: new Date(inv.order_date) } : {}),
        })),
      });
    }

    // 9. Record the admission examination (Steps 4 and 5). This used to be a
    // fire-and-forget POST whose failure was swallowed by a console.warn, so
    // both examinations could vanish without the clinician ever being told.
    if (data.examination) {
      await tx.clinicalExamination.create({
        data: {
          admissionId: admission.id,
          examinerId: req.user.id,
          generalExams: data.examination.general_exams,
          localExams: data.examination.local_exams,
        },
      });
    }

    // 10. Update Bed Status
    await tx.bed.update({
      where: { id: data.admission.bed_id },
      data: { status: "OCCUPIED" },
    });
    // The admission was fetched (with its `bed` relation) before this update,
    // so the in-memory copy still shows the pre-admission bed status.
    if (admission.bed) admission.bed.status = "OCCUPIED";

    return {
      targetId: admission.id,
      result: formatAdmission(admission)
    };
  });
};

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
          transferReason: data.transfer_reason || null,
          placeOfTransfer: data.place_of_transfer || null,
          transferDoctorName: data.transfer_doctor_name || null,
          chiefComplaint: data.chief_complaint || null,
          complaintAnalysis: data.complaint_analysis || null,
          symptomsRelatedSystem: data.symptoms_related_system || null,
          symptomsOtherSystems: data.symptoms_other_systems || null,
          previousInvestigations: data.previous_investigations || null,
          previousTreatments: data.previous_treatments || null,
          provisionalDiagnosis: data.provisional_diagnosis || null,
          status: "ACTIVE",
        },
        include: {
          patient: true,
          bed: true,
          doctor: true,
          nurses: {
            where: { isArchived: false },
            include: {
              nurse: true,
            },
          },
          vitalSigns: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
          diagnoses: {
            where: { isArchived: false },
          },
        },
      });

      await tx.bed.update({
        where: { id: data.bed_id },
        data: { status: "OCCUPIED" },
      });
      // The admission was fetched (with its `bed` relation) before this update,
      // so the in-memory copy still shows the pre-admission bed status.
      if (admission.bed) admission.bed.status = "OCCUPIED";

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

// Acuity and bed-unit are computed from the latest vitals reading and the bed
// number rather than stored, so they're resolved in SQL here. The thresholds
// and the unit prefixes mirror the ones the census screen used to apply in the
// browser — keep the two in step if either changes.
const resolveDerivedFilterIds = async (query) => {
  const acuity = query.acuity && query.acuity !== "All" ? query.acuity : null;
  const unit = query.unit && query.unit !== "All" ? query.unit : null;

  if (!acuity && !unit) return null;

  const rows = await prisma.$queryRaw`
    WITH latest_vitals AS (
      SELECT DISTINCT ON (v.admission_id)
             v.admission_id, v.temperature, v.pulse, v.systolic_bp, v.spo2
      FROM vital_signs v
      WHERE v.is_archived = false
      ORDER BY v.admission_id, v.recorded_at DESC
    ),
    scored AS (
      SELECT a.id,
             COALESCE(lv.spo2, 98)          AS spo2,
             COALESCE(lv.pulse, 75)         AS pulse,
             COALESCE(lv.temperature, 37.0) AS temp,
             COALESCE(lv.systolic_bp, 120)  AS sbp,
             b.bed_number
      FROM admissions a
      JOIN beds b ON b.id = a.bed_id
      LEFT JOIN latest_vitals lv ON lv.admission_id = a.id
      WHERE a.is_archived = false
    ),
    classified AS (
      SELECT id,
             CASE
               WHEN (CASE WHEN spo2 < 90 THEN 2 ELSE 0 END)
                  + (CASE WHEN pulse > 130 OR pulse < 45 THEN 1 ELSE 0 END)
                  + (CASE WHEN temp > 39.0 OR temp < 35.5 THEN 1 ELSE 0 END)
                  + (CASE WHEN sbp > 180 OR sbp < 85 THEN 1 ELSE 0 END) > 0
                 THEN 'Critical'
               WHEN (CASE WHEN spo2 >= 90 AND spo2 < 95 THEN 1 ELSE 0 END)
                  + (CASE WHEN NOT (pulse > 130 OR pulse < 45)
                            AND (pulse > 100 OR pulse < 55) THEN 1 ELSE 0 END)
                  + (CASE WHEN NOT (temp > 39.0 OR temp < 35.5)
                            AND (temp > 38.0 OR temp < 36.0) THEN 1 ELSE 0 END)
                  + (CASE WHEN NOT (sbp > 180 OR sbp < 85)
                            AND (sbp > 140 OR sbp < 95) THEN 1 ELSE 0 END) > 0
                 THEN 'Watchful'
               ELSE 'Stable'
             END AS acuity,
             CASE
               WHEN bed_number LIKE 'CCU-7%' THEN 'CCU-7'
               WHEN bed_number LIKE 'CCU-8%' THEN 'CCU-8'
               WHEN bed_number LIKE 'ICU-N%' THEN 'ICU-North'
               WHEN bed_number LIKE 'ICU-S%' THEN 'ICU-South'
               WHEN bed_number LIKE '%-%'    THEN split_part(bed_number, '-', 1)
               ELSE split_part(bed_number, '/', 1)
             END AS unit
      FROM scored
    )
    SELECT id FROM classified
    WHERE (${acuity}::text IS NULL OR acuity = ${acuity})
      AND (${unit}::text   IS NULL OR unit   = ${unit})
  `;

  return rows.map((row) => row.id);
};

// Census totals for the whole ward — the list screen can no longer derive these
// from a single page, and the unit dropdown needs every unit in use, not just
// the ones on screen.
const getAdmissionCensus = async (query = {}) => {
  const status = query.status || "ACTIVE";

  const rows = await prisma.$queryRaw`
    WITH latest_vitals AS (
      SELECT DISTINCT ON (v.admission_id)
             v.admission_id, v.temperature, v.pulse, v.systolic_bp, v.spo2
      FROM vital_signs v
      WHERE v.is_archived = false
      ORDER BY v.admission_id, v.recorded_at DESC
    ),
    scored AS (
      SELECT a.id,
             COALESCE(lv.spo2, 98)          AS spo2,
             COALESCE(lv.pulse, 75)         AS pulse,
             COALESCE(lv.temperature, 37.0) AS temp,
             COALESCE(lv.systolic_bp, 120)  AS sbp,
             b.bed_number
      FROM admissions a
      JOIN beds b ON b.id = a.bed_id
      LEFT JOIN latest_vitals lv ON lv.admission_id = a.id
      WHERE a.is_archived = false AND a.status = ${status}::"AdmissionStatus"
    )
    SELECT
      CASE
        WHEN (CASE WHEN spo2 < 90 THEN 2 ELSE 0 END)
           + (CASE WHEN pulse > 130 OR pulse < 45 THEN 1 ELSE 0 END)
           + (CASE WHEN temp > 39.0 OR temp < 35.5 THEN 1 ELSE 0 END)
           + (CASE WHEN sbp > 180 OR sbp < 85 THEN 1 ELSE 0 END) > 0
          THEN 'Critical'
        WHEN (CASE WHEN spo2 >= 90 AND spo2 < 95 THEN 1 ELSE 0 END)
           + (CASE WHEN NOT (pulse > 130 OR pulse < 45)
                     AND (pulse > 100 OR pulse < 55) THEN 1 ELSE 0 END)
           + (CASE WHEN NOT (temp > 39.0 OR temp < 35.5)
                     AND (temp > 38.0 OR temp < 36.0) THEN 1 ELSE 0 END)
           + (CASE WHEN NOT (sbp > 180 OR sbp < 85)
                     AND (sbp > 140 OR sbp < 95) THEN 1 ELSE 0 END) > 0
          THEN 'Watchful'
        ELSE 'Stable'
      END AS acuity,
      CASE
        WHEN bed_number LIKE 'CCU-7%' THEN 'CCU-7'
        WHEN bed_number LIKE 'CCU-8%' THEN 'CCU-8'
        WHEN bed_number LIKE 'ICU-N%' THEN 'ICU-North'
        WHEN bed_number LIKE 'ICU-S%' THEN 'ICU-South'
        WHEN bed_number LIKE '%-%'    THEN split_part(bed_number, '-', 1)
        ELSE split_part(bed_number, '/', 1)
      END AS unit,
      COUNT(*)::int AS count
    FROM scored
    GROUP BY 1, 2
  `;

  const stats = { total: 0, critical: 0, watchful: 0, stable: 0 };
  const units = new Set();

  for (const row of rows) {
    const count = Number(row.count);
    stats.total += count;
    if (row.acuity === "Critical") stats.critical += count;
    else if (row.acuity === "Watchful") stats.watchful += count;
    else stats.stable += count;
    if (row.unit) units.add(row.unit);
  }

  return { stats, units: Array.from(units).sort() };
};

const getAdmissions = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where = { isArchived: false };
  if (query.status) where.status = query.status;
  if (query.bed_id) where.bedId = query.bed_id;
  if (query.search && query.search.trim()) {
    const search = query.search.trim();
    where.OR = [
      { patient: { name: { contains: search, mode: "insensitive" } } },
      { patient: { mrn: { contains: search, mode: "insensitive" } } },
      { provisionalDiagnosis: { contains: search, mode: "insensitive" } },
      {
        diagnoses: {
          some: {
            isArchived: false,
            conditionName: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  // Acuity and bed-unit are derived values, so they can't be expressed as a
  // Prisma `where`. Resolve them to a concrete id set first, then page over it.
  const derivedIds = await resolveDerivedFilterIds(query);
  if (derivedIds !== null) {
    if (derivedIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
    where.id = { in: derivedIds };
  }

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { admittedAt: "desc" },
      include: {
        patient: true,
        bed: true,
        doctor: true,
        nurses: {
          where: { isArchived: false },
          include: {
            nurse: true,
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        diagnoses: {
          where: { isArchived: false },
        },
        // Pending orders travel with the list so a caller showing many
        // admissions at once (the dashboard) does not need one request per
        // patient to count them. Narrow select and a status-indexed filter
        // keep this cheap — only what the summary views actually render.
        investigationOrders: {
          where: { status: "Pending" },
          select: { id: true, orderName: true, type: true, orderDate: true },
          orderBy: { orderDate: "desc" },
        },
      },
    }),
    prisma.admission.count({ where }),
  ]);

  return {
    data: admissions.map(formatAdmission),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getAdmissionById = async (id) => {
  const admission = await prisma.admission.findUnique({
    where: { id },
    include: {
      patient: true,
      bed: true,
      doctor: true,
      nurses: {
        where: { isArchived: false },
        include: {
          nurse: true,
        },
      },
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
      include: {
        patient: true,
        bed: true,
        doctor: true,
        nurses: {
          where: { isArchived: false },
          include: {
            nurse: true,
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        diagnoses: {
          where: { isArchived: false },
        },
      },
    });

    await tx.bed.update({
      where: { id: admission.bedId },
      data: { status: "AVAILABLE" },
    });
    // The admission was fetched (with its `bed` relation) before this update,
    // so the in-memory copy still shows the pre-discharge bed status.
    if (updated.bed) updated.bed.status = "AVAILABLE";

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
  createFullAdmission,
  getAdmissions,
  getAdmissionCensus,
  getAdmissionById,
  dischargeAdmission,
  archiveAdmission,
  assignNurse,
  getAdmissionNurses,
  unassignNurse,
};
