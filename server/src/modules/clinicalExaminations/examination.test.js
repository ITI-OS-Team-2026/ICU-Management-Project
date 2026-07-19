const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

describe("Clinical Examinations API", () => {
  let adminToken, doctorToken, nurseToken, testAdmission, testDoctor, testNurse;

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
    }
    return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret || "secret", { expiresIn: "12h" });
  };

  beforeAll(async () => {
    adminToken = await generateTokenForRole("admin.exam@example.com", "SYSTEM_ADMIN");
    doctorToken = await generateTokenForRole("doctor.exam@example.com", "MEDICAL_RESIDENT");
    nurseToken = await generateTokenForRole("nurse.exam@example.com", "ICU_NURSE");

    testDoctor = await prisma.user.findUnique({ where: { email: "doctor.exam@example.com" } });
    testNurse = await prisma.user.findUnique({ where: { email: "nurse.exam@example.com" } });

    const testPatient = await prisma.patient.create({
      data: {
        name: "Exam Patient",
        age: 30,
        mrn: "MRN-EXAM-123"
      }
    });

    const testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-EXAM-1",
        status: "OCCUPIED"
      }
    });

    testAdmission = await prisma.admission.create({
      data: {
        patientId: testPatient.id,
        bedId: testBed.id,
        doctorId: testDoctor.id,
        status: "ACTIVE"
      }
    });
  });

  afterAll(async () => {
    await prisma.clinicalExamination.deleteMany();
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-EXAM-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-EXAM-123" } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin.exam@example.com", "doctor.exam@example.com", "nurse.exam@example.com"] }
      }
    });
  });

  describe("POST /api/admissions/:id/examinations", () => {
    it("should allow a doctor to create an examination", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/examinations`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`)
        .send({
          general_exams: { note: "General exam looks fine" },
          local_exams: { note: "Local exam clear" }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.examinerId).toBe(testDoctor.id);
    });

    it("should not allow a nurse to create an examination", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/examinations`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({
          general_exams: { note: "General exam" },
          local_exams: { note: "Local exam" }
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/admissions/:id/examinations", () => {
    it("should retrieve examinations for an admission", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/examinations`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("generalExams");
      expect(res.body[0].examiner).toHaveProperty("id");
    });
  });
});
