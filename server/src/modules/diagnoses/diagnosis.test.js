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

async function cleanupTestData() {
  await prisma.diagnosis.deleteMany({});
  await prisma.admissionNurse.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "DIAG-TEST-" } } });
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
          status: "ACTIVE",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.conditionName).toBe("COVID-19");
      expect(res.body.status).toBe("ACTIVE");
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
          status: "ACTIVE",
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
          status: "ACTIVE",
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
          status: "ACTIVE",
          diagnosedById: residentUser.id,
        },
      });
      testDiagnosisId = diagnosis.id;
    });

    it("should archive old diagnosis and create a new one (append-only) as resident", async () => {
      const res = await request(app)
        .patch(`/api/diagnoses/${testDiagnosisId}`)
        .set("Cookie", residentCookie)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("RESOLVED");
      
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
});
