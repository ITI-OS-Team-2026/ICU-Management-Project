const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

describe("AI Services API (Summaries & RAG Query)", () => {
  let residentToken, specialistToken, nurseToken;
  let testAdmission, testResident, testPatient, testBed;

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
    return jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret || "secret",
      { expiresIn: "12h" }
    );
  };

  beforeAll(async () => {
    residentToken = await generateTokenForRole("resident.ai@example.com", "MEDICAL_RESIDENT");
    specialistToken = await generateTokenForRole("specialist.ai@example.com", "ICU_SPECIALIST");
    nurseToken = await generateTokenForRole("nurse.ai@example.com", "ICU_NURSE");

    testResident = await prisma.user.findUnique({ where: { email: "resident.ai@example.com" } });

    testPatient = await prisma.patient.create({
      data: {
        name: "AI Patient",
        age: 55,
        mrn: "MRN-AI-123",
      },
    });

    testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-AI-1",
        status: "OCCUPIED",
      },
    });

    testAdmission = await prisma.admission.create({
      data: {
        patientId: testPatient.id,
        bedId: testBed.id,
        doctorId: testResident.id,
        status: "ACTIVE",
      },
    });

    await prisma.vitalSign.create({
      data: {
        admissionId: testAdmission.id,
        recordedById: testResident.id,
        temperature: 37.2,
        pulse: 88,
        systolicBp: 120,
        diastolicBp: 75,
        respiratoryRate: 16,
        spo2: 97,
      },
    });

    await prisma.labResult.create({
      data: {
        admissionId: testAdmission.id,
        recordedById: testResident.id,
        testName: "Serum Creatinine",
        resultValue: "1.1 mg/dL",
        abnormal: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.aiQueryLog.deleteMany({ where: { admissionId: testAdmission.id } });
    await prisma.aiSummary.deleteMany({ where: { admissionId: testAdmission.id } });
    await prisma.vitalSign.deleteMany({ where: { admissionId: testAdmission.id } });
    await prisma.labResult.deleteMany({ where: { admissionId: testAdmission.id } });
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-AI-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-AI-123" } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["resident.ai@example.com", "specialist.ai@example.com", "nurse.ai@example.com"],
        },
      },
    });
  });

  describe("POST /api/ai/summary", () => {
    it("should allow a resident to generate a 24_HOUR summary", async () => {
      const res = await request(app)
        .post("/api/ai/summary")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: testAdmission.id,
          summary_type: "24_HOUR",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data).toHaveProperty("overall_summary");
      expect(res.body.data).toHaveProperty("generated_at");
      expect(res.body.data.overall_summary).toContain("Hemodynamic Status");
      expect(res.body.data.overall_summary).toContain("Respiratory State");
    });

    it("should allow a specialist to generate an ON_DEMAND summary", async () => {
      const res = await request(app)
        .post("/api/ai/summary")
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({
          admission_id: testAdmission.id,
          summary_type: "ON_DEMAND",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.overall_summary).toBeTruthy();
    });

    it("should not allow a nurse to generate a summary", async () => {
      const res = await request(app)
        .post("/api/ai/summary")
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({
          admission_id: testAdmission.id,
          summary_type: "24_HOUR",
        });

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 for invalid summary_type", async () => {
      const res = await request(app)
        .post("/api/ai/summary")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: testAdmission.id,
          summary_type: "WEEKLY",
        });

      expect(res.statusCode).toBe(400);
    });

    it("should return 404 for unknown admission", async () => {
      const res = await request(app)
        .post("/api/ai/summary")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: "00000000-0000-0000-0000-000000000000",
          summary_type: "24_HOUR",
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/admissions/:id/summaries", () => {
    it("should allow nurse, resident, and specialist to list summaries", async () => {
      const nurseRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/summaries`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(nurseRes.statusCode).toBe(200);
      expect(nurseRes.body.results).toBeGreaterThanOrEqual(2);
      expect(nurseRes.body.data[0]).toHaveProperty("overall_summary");

      const residentRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/summaries`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(residentRes.statusCode).toBe(200);
    });
  });

  describe("POST /api/ai/query", () => {
    it("should allow a resident to ask a RAG question", async () => {
      const res = await request(app)
        .post("/api/ai/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: testAdmission.id,
          question: "What is the latest SpO2 and creatinine?",
          include_history: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data).toHaveProperty("ai_response");
      expect(res.body.data).toHaveProperty("cited_sources");
      expect(Array.isArray(res.body.data.cited_sources)).toBe(true);
      expect(res.body.data.cited_sources.length).toBeGreaterThan(0);
    });

    it("should not allow a nurse to query RAG", async () => {
      const res = await request(app)
        .post("/api/ai/query")
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({
          admission_id: testAdmission.id,
          question: "Any allergies?",
        });

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 when question is missing", async () => {
      const res = await request(app)
        .post("/api/ai/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: testAdmission.id,
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/admissions/:id/ai-query-logs", () => {
    it("should allow resident to list query logs with limit", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/ai-query-logs`)
        .query({ limit: 5 })
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty("question");
      expect(res.body.data[0]).toHaveProperty("ai_response");
    });

    it("should not allow nurse to list query logs", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/ai-query-logs`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
