const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");

require("dotenv").config();

const COOKIE_NAME = config.cookieName || "token";

const generateTokenForRole = async (email, role) => {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        firstName: "Test",
        lastName: role,
        passwordHash: "dummyhash",
        role,
        status: "ACTIVE",
      },
    });
  } else if (user.role !== role || user.status !== "ACTIVE") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role, status: "ACTIVE" },
    });
  }
  return {
    token: jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: "12h" }),
    user,
  };
};

// Every delete is scoped to this suite's own DIAG-TEST- patients. An unscoped
// deleteMany({}) here empties the whole ward when tests point at a shared DB.
const testPatientFilter = { mrn: { startsWith: "DIAG-TEST-" } };
const testAdmissionFilter = { patient: testPatientFilter };

async function cleanupTestData() {
  await prisma.diagnosisConcern.deleteMany({
    where: { diagnosis: { admission: testAdmissionFilter } },
  });
  await prisma.diagnosisAcknowledgement.deleteMany({
    where: { diagnosis: { admission: testAdmissionFilter } },
  });
  await prisma.diagnosis.deleteMany({ where: { admission: testAdmissionFilter } });
  await prisma.admissionNurse.deleteMany({ where: { admission: testAdmissionFilter } });
  await prisma.admission.deleteMany({ where: testAdmissionFilter });
  await prisma.patient.deleteMany({ where: testPatientFilter });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "DIAG-" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Diagnoses API", () => {
  let residentCookie;
  let residentUser;
  let nurseCookie;
  let testAdmissionId;
  let testPatientId;
  let testBedId;

  beforeAll(async () => {
    const resident = await generateTokenForRole("resident-diag@test.com", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${resident.token}`;
    residentUser = resident.user;

    const nurse = await generateTokenForRole("nurse-diag@test.com", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurse.token}`;
  });

  beforeEach(async () => {
    const patient = await prisma.patient.create({
      data: {
        mrn: "DIAG-TEST-001",
        name: "Diag Test Patient",
        age: 40,
      },
    });
    testPatientId = patient.id;

    const bed = await prisma.bed.create({
      data: { bedNumber: "DIAG-01", status: "OCCUPIED" },
    });
    testBedId = bed.id;

    const admission = await prisma.admission.create({
      data: {
        patientId: testPatientId,
        bedId: testBedId,
        doctorId: residentUser.id,
        status: "ACTIVE",
      },
    });
    testAdmissionId = admission.id;
  });

  describe("POST /admissions/:id/diagnoses", () => {
    it("should create a diagnosis as a resident", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({
          condition_name: "COVID-19",
          status: "CONFIRMED",
          type: "PRIMARY",
          icd_code: "U07.1",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.conditionName).toBe("COVID-19");
      expect(res.body.status).toBe("CONFIRMED");
      expect(res.body.type).toBe("PRIMARY");
      expect(res.body.icdCode).toBe("U07.1");
      expect(res.body.diagnosedById).toBe(residentUser.id);
    });

    it("should deny nurse from creating diagnosis", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", nurseCookie)
        .send({ condition_name: "COVID-19" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /admissions/:id/diagnoses", () => {
    beforeEach(async () => {
      await prisma.diagnosis.create({
        data: {
          admissionId: testAdmissionId,
          conditionName: "Hypertension",
          status: "CONFIRMED",
          diagnosedById: residentUser.id,
        },
      });
    });

    it("should retrieve diagnoses for admission", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
      expect(res.body[0].conditionName).toBe("Hypertension");
      expect(res.body[0].diagnosedBy).toHaveProperty("id", residentUser.id);
    });
  });

  describe("DELETE /diagnoses/:id", () => {
    let testDiagnosisId;

    beforeEach(async () => {
      const diagnosis = await prisma.diagnosis.create({
        data: {
          admissionId: testAdmissionId,
          conditionName: "Pneumonia",
          status: "CONFIRMED",
          diagnosedById: residentUser.id,
        },
      });
      testDiagnosisId = diagnosis.id;
    });

    it("should soft-delete diagnosis as resident", async () => {
      const res = await request(app)
        .delete(`/api/diagnoses/${testDiagnosisId}`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(204);

      const dbDiag = await prisma.diagnosis.findUnique({
        where: { id: testDiagnosisId },
      });
      expect(dbDiag.isArchived).toBe(true);
      expect(dbDiag.archivedAt).not.toBeNull();
    });
  });

  describe("PATCH /diagnoses/:id", () => {
    let testDiagnosisId;

    beforeEach(async () => {
      const diagnosis = await prisma.diagnosis.create({
        data: {
          admissionId: testAdmissionId,
          conditionName: "Asthma",
          status: "CONFIRMED",
          diagnosedById: residentUser.id,
        },
      });
      testDiagnosisId = diagnosis.id;
    });

    it("should archive old diagnosis and create a new one (append-only) as resident", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${testDiagnosisId}`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "Severe persistent asthma" });

      expect(res.status).toBe(200);
      expect(res.body.conditionName).toBe("Severe persistent asthma");
      // Authorship of the original entry survives the amendment.
      expect(res.body.originalDiagnosedBy.id).toBe(residentUser.id);
      
      // The newly created diagnosis should have a DIFFERENT ID from the old one
      const newDiagnosisId = res.body.id;
      expect(newDiagnosisId).not.toBe(testDiagnosisId);

      // Verify the old one was soft-deleted
      const oldDiag = await prisma.diagnosis.findUnique({
        where: { id: testDiagnosisId },
      });
      expect(oldDiag.isArchived).toBe(true);
      expect(oldDiag.archivedAt).not.toBeNull();
    });
  });
  describe("PATCH /diagnoses/:id/status — working the differential", () => {
    let suspectedId;

    beforeEach(async () => {
      const diagnosis = await prisma.diagnosis.create({
        data: {
          admissionId: testAdmissionId,
          conditionName: "Pulmonary embolism",
          status: "SUSPECTED",
          diagnosedById: residentUser.id,
          originalDiagnosedById: residentUser.id,
        },
      });
      suspectedId = diagnosis.id;
    });

    it("should confirm a suspected diagnosis with a reason", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "CONFIRMED", reason: "CTPA shows a segmental filling defect." });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("CONFIRMED");
      expect(res.body.clinicalNotes).toMatch(/CTPA/);
      expect(res.body.statusChangedBy.id).toBe(residentUser.id);
    });

    it("should rule out a suspected diagnosis and record why", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "RULED_OUT", reason: "CTPA negative; D-dimer explained by sepsis." });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("RULED_OUT");
      expect(res.body.ruledOutReason).toMatch(/CTPA negative/);
    });

    it("should require a clinical reason", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/clinical reason is required/);
    });

    it("should refuse to resolve something never confirmed", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "RESOLVED", reason: "Patient improved" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Cannot move a SUSPECTED diagnosis to RESOLVED/);
    });

    it("should treat RULED_OUT as terminal", async () => {
      await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "RULED_OUT", reason: "Imaging negative" });

      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "CONFIRMED", reason: "Changed my mind" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot change status/);
    });

    it("should record resolution date and reason", async () => {
      await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "CONFIRMED", reason: "CTPA positive" });

      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", residentCookie)
        .send({ status: "RESOLVED", reason: "Completed anticoagulation, asymptomatic." });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("RESOLVED");
      expect(res.body.resolvedAt).not.toBeNull();
      expect(res.body.resolutionReason).toMatch(/anticoagulation/);
      // A resolved episode must not inherit a rule-out reason.
      expect(res.body.ruledOutReason).toBeNull();
    });

    it("should deny a nurse from changing status", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${suspectedId}/status`)
        .set("Cookie", nurseCookie)
        .send({ status: "CONFIRMED", reason: "Looks like it" });

      expect(res.status).toBe(403);
    });
  });

  describe("Primary diagnosis", () => {
    it("should demote the previous primary when a new one is set", async () => {
      const first = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "Sepsis", type: "PRIMARY" });

      const second = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "Septic shock", type: "PRIMARY" });

      expect(second.status).toBe(201);

      const demoted = await prisma.diagnosis.findUnique({ where: { id: first.body.id } });
      expect(demoted.type).toBe("SECONDARY");
      expect(second.body.type).toBe("PRIMARY");
    });

    it("should warn about a duplicate open condition", async () => {
      await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "Sepsis" });

      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "sepsis" });

      expect(res.status).toBe(201);
      expect(res.body.duplicateWarning).toHaveLength(1);
    });

    it("should reject a malformed ICD-10 code", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/diagnoses`)
        .set("Cookie", residentCookie)
        .send({ condition_name: "Sepsis", icd_code: "not-a-code" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ICD-10/);
    });
  });

  describe("Nurse participation", () => {
    let diagnosisId;

    beforeEach(async () => {
      const diagnosis = await prisma.diagnosis.create({
        data: {
          admissionId: testAdmissionId,
          conditionName: "Aspiration pneumonia",
          status: "CONFIRMED",
          diagnosedById: residentUser.id,
          originalDiagnosedById: residentUser.id,
        },
      });
      diagnosisId = diagnosis.id;
    });

    it("should let a nurse acknowledge a diagnosis", async () => {
      const res = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/acknowledge`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(201);
      expect(res.body.diagnosisId).toBe(diagnosisId);
    });

    it("should be idempotent when acknowledged twice", async () => {
      const first = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/acknowledge`)
        .set("Cookie", nurseCookie);
      const second = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/acknowledge`)
        .set("Cookie", nurseCookie);

      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);

      const count = await prisma.diagnosisAcknowledgement.count({ where: { diagnosisId } });
      expect(count).toBe(1);
    });

    it("should deny a doctor from acknowledging", async () => {
      const res = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/acknowledge`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(403);
    });

    it("should let a nurse raise a concern and a doctor answer it", async () => {
      const raised = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/concerns`)
        .set("Cookie", nurseCookie)
        .send({ note: "No cough, no crackles, and the patient is afebrile since admission." });

      expect(raised.status).toBe(201);
      expect(raised.body.status).toBe("OPEN");

      const open = await request(app)
        .get(`/api/admissions/${testAdmissionId}/diagnosis-concerns`)
        .set("Cookie", residentCookie);
      expect(open.body).toHaveLength(1);

      const answered = await request(app)
        .patch(`/api/diagnosis-concerns/${raised.body.id}`)
        .set("Cookie", residentCookie)
        .send({ status: "ADDRESSED", response_note: "Agreed — repeat CXR ordered." });

      expect(answered.status).toBe(200);
      expect(answered.body.status).toBe("ADDRESSED");
      expect(answered.body.respondedBy.id).toBe(residentUser.id);
    });

    it("should require an answer, not just a status", async () => {
      const raised = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/concerns`)
        .set("Cookie", nurseCookie)
        .send({ note: "Presentation does not fit." });

      const res = await request(app)
        .patch(`/api/diagnosis-concerns/${raised.body.id}`)
        .set("Cookie", residentCookie)
        .send({ status: "DISMISSED" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/needs an answer/);
    });

    it("should deny a nurse from answering a concern", async () => {
      const raised = await request(app)
        .post(`/api/diagnoses/${diagnosisId}/concerns`)
        .set("Cookie", nurseCookie)
        .send({ note: "Presentation does not fit." });

      const res = await request(app)
        .patch(`/api/diagnosis-concerns/${raised.body.id}`)
        .set("Cookie", nurseCookie)
        .send({ status: "ADDRESSED", response_note: "self-answer" });

      expect(res.status).toBe(403);
    });
  });
});
