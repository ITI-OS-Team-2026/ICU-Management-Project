const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");
const fs = require("fs");
const path = require("path");

const COOKIE_NAME = config.cookieName || "token";

describe("Medical Documents API", () => {
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
    doctorToken = await generateTokenForRole("doctor.doc@example.com", "MEDICAL_RESIDENT");
    nurseToken = await generateTokenForRole("nurse.doc@example.com", "ICU_NURSE");

    testDoctor = await prisma.user.findUnique({ where: { email: "doctor.doc@example.com" } });

    testPatient = await prisma.patient.create({
      data: {
        name: "Doc Patient",
        age: 60,
        mrn: "MRN-DOC-123",
      },
    });

    testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-DOC-1",
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
    // Cleanup files in uploads/documents
    const uploadDir = path.join(__dirname, "../../../uploads/documents");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }

    await prisma.documentEmbedding.deleteMany();
    await prisma.medicalDocument.deleteMany();
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-DOC-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-DOC-123" } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["doctor.doc@example.com", "nurse.doc@example.com"] },
      },
    });
  });

  describe("POST /api/admissions/:id/documents (Upload)", () => {
    it("should allow a nurse to upload a valid pdf document", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .attach("file", Buffer.from("dummy pdf content"), "report.pdf")
        .field("document_type", "Lab");

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.originalFilename).toBe("report.pdf");
      expect(res.body.data.embeddingStatus).toBe("PENDING");

      // Verify that after a brief timeout, status changes to COMPLETED
      await new Promise((resolve) => setTimeout(resolve, 200));

      const getRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data[0].embeddingStatus).toBe("COMPLETED");
    });

    it("should return 415 for unsupported file types", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .attach("file", Buffer.from("dummy exe"), "test.exe")
        .field("document_type", "Lab");

      expect(res.statusCode).toBe(415);
      expect(res.body.message).toContain("Unsupported file type");
    });

    it("should return 413 for files exceeding 10MB", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .attach("file", largeBuffer, "large.pdf")
        .field("document_type", "Lab");

      expect(res.statusCode).toBe(413);
      expect(res.body.message).toContain("limit exceeded");
    });
  });

  describe("GET /api/admissions/:id/documents", () => {
    it("should allow nurse and doctor to retrieve the list of documents", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/documents/:id/download", () => {
    it("should allow download of the uploaded document", async () => {
      const listRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      const docId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/documents/${docId}/download`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-disposition"]).toContain("attachment");
    });
  });

  describe("DELETE /api/documents/:id", () => {
    it("should allow a doctor to soft-archive a document", async () => {
      const listRes = await request(app)
        .get(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      const docId = listRes.body.data[0].id;

      const deleteRes = await request(app)
        .delete(`/api/documents/${docId}`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(deleteRes.statusCode).toBe(204);

      const listResAfter = await request(app)
        .get(`/api/admissions/${testAdmission.id}/documents`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      const found = listResAfter.body.data.find((d) => d.id === docId);
      expect(found).toBeUndefined();
    });

    it("should return 404 for a non-existent document deletion", async () => {
      const res = await request(app)
        .delete(`/api/documents/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", `${COOKIE_NAME}=${doctorToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
