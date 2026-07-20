const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

describe("SOAP Follow-ups API", () => {
  let doctorToken, nurseToken, testAdmission, testDoctor, testPatient, testBed;

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
    doctorToken = await generateTokenForRole("doctor.followup@example.com", "MEDICAL_RESIDENT");
    nurseToken = await generateTokenForRole("nurse.followup@example.com", "ICU_NURSE");

    testDoctor = await prisma.user.findUnique({ where: { email: "doctor.followup@example.com" } });

    testPatient = await prisma.patient.create({
      data: {
        name: "Followup Patient",
        age: 45,
        mrn: "MRN-FOLLOWUP-123",
      },
    });

    testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-FOLLOWUP-1",
        status: "OCCUPIED",
      },
    });

    testAdmission = await prisma.admission.create({
      data: {
        patientId: testPatient.id,
        bedId: testBed.id,
        doctorId: testDoctor.id,
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await prisma.followUp.deleteMany();
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-FOLLOWUP-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-FOLLOWUP-123" } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["doctor.followup@example.com", "nurse.followup@example.com"] },
      },
    });
  });

  describe("POST /api/admissions/:id/follow-ups", () => {
    it("should allow a doctor to create a follow-up", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/follow-ups`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`)
        .send({
          subjective: "Patient reports feeling better.",
          objective: "Vitals stable, temp 37C.",
          assessment: "Improving.",
          plan: "Continue current treatment.",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.subjective).toBe("Patient reports feeling better.");
      expect(res.body.data.objective).toBe("Vitals stable, temp 37C.");
    });

    it("should not allow a nurse to create a follow-up", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/follow-ups`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({
          subjective: "Nurse trying to create",
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/admissions/:id/follow-ups", () => {
    it("should allow both doctor and nurse to retrieve follow-ups", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/follow-ups`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body.results).toBe(1);
    });
  });

  describe("DELETE /api/follow-ups/:id", () => {
    it("should allow a doctor to soft-archive a follow-up", async () => {
      const listRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/follow-ups`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);
      
      const followUpId = listRes.body.data[0].id;

      const deleteRes = await request(app)
        .delete(`/api/follow-ups/${followUpId}`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(deleteRes.statusCode).toBe(204);

      // Verify it's no longer returned in the list (soft-deleted)
      const listRes2 = await request(app)
        .get(`/api/admissions/${testAdmission.id}/follow-ups`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(listRes2.body.results).toBe(0);
    });

    it("should return 404 when deleting a non-existent follow-up", async () => {
      const res = await request(app)
        .delete(`/api/follow-ups/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
