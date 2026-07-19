const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

describe("Clinical & Nursing Notes API", () => {
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
    adminToken = await generateTokenForRole("admin.notes@example.com", "SYSTEM_ADMIN");
    doctorToken = await generateTokenForRole("doctor.notes@example.com", "MEDICAL_RESIDENT");
    nurseToken = await generateTokenForRole("nurse.notes@example.com", "ICU_NURSE");

    testDoctor = await prisma.user.findUnique({ where: { email: "doctor.notes@example.com" } });
    testNurse = await prisma.user.findUnique({ where: { email: "nurse.notes@example.com" } });

    const testPatient = await prisma.patient.create({
      data: {
        name: "Notes Patient",
        age: 30,
        mrn: "MRN-NOTES-123"
      }
    });

    const testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-NOTES-1",
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
    await prisma.clinicalNote.deleteMany();
    await prisma.nursingNote.deleteMany();
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-NOTES-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-NOTES-123" } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin.notes@example.com", "doctor.notes@example.com", "nurse.notes@example.com"] }
      }
    });
  });

  describe("Clinical Notes", () => {
    let clinicalNoteId;

    it("should allow a doctor to create a clinical note", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/notes/clinical`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`)
        .send({ content: "Patient is stable. No signs of infection." });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.content).toBe("Patient is stable. No signs of infection.");
      clinicalNoteId = res.body.data.id;
    });

    it("should not allow a nurse to create a clinical note", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/notes/clinical`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ content: "Nurse note in clinical route" });

      expect(res.statusCode).toBe(403);
    });

    it("should allow nurse and doctor to retrieve clinical notes", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/notes/clinical`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should not allow a nurse to delete a clinical note", async () => {
      const res = await request(app)
        .delete(`/api/notes/clinical/${clinicalNoteId}`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should allow a doctor to delete a clinical note", async () => {
      const res = await request(app)
        .delete(`/api/notes/clinical/${clinicalNoteId}`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(204);
    });
  });

  describe("Nursing Notes", () => {
    let nursingNoteId;

    it("should allow a nurse to create a nursing note", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/notes/nursing`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ note: "Patient repositioned. IV checked." });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.note).toBe("Patient repositioned. IV checked.");
      nursingNoteId = res.body.data.id;
    });

    it("should not allow a doctor to create a nursing note", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/notes/nursing`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`)
        .send({ note: "Doctor note in nursing route" });

      expect(res.statusCode).toBe(403);
    });

    it("should allow nurse and doctor to retrieve nursing notes", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/notes/nursing`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should not allow a nurse to delete a nursing note", async () => {
      const res = await request(app)
        .delete(`/api/notes/nursing/${nursingNoteId}`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should allow a doctor to delete a nursing note", async () => {
      const res = await request(app)
        .delete(`/api/notes/nursing/${nursingNoteId}`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(204);
    });
  });
});
