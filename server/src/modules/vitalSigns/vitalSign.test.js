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
  await prisma.vitalSign.deleteMany({});
  await prisma.admissionNurse.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "VS-TEST-" } } });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "VS-" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Vital Signs API", () => {
  let residentCookie;
  let residentUser;
  let nurseCookie;
  let nurseUser;
  let testAdmissionId;
  let testPatientId;
  let testBedId;

  beforeAll(async () => {
    const resident = await generateTokenForRole("resident-vs@test.com", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${resident.token}`;
    residentUser = resident.user;

    const nurse = await generateTokenForRole("nurse-vs@test.com", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurse.token}`;
    nurseUser = nurse.user;
  });

  beforeEach(async () => {
    const patient = await prisma.patient.create({
      data: {
        mrn: "VS-TEST-001",
        name: "VS Test Patient",
        age: 40,
      },
    });
    testPatientId = patient.id;

    const bed = await prisma.bed.create({
      data: { bedNumber: "VS-01", status: "OCCUPIED" },
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

  describe("POST /admissions/:id/vitals", () => {
    it("should allow a nurse to log normal vitals", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", nurseCookie)
        .send({
          temperature: 37.0,
          pulse: 80,
          systolic_bp: 120,
          diastolic_bp: 80,
          respiratory_rate: 16,
          spo2: 98,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.temperature).toBe("37");
      expect(res.body.pulse).toBe(80);
      expect(res.body.recordedById).toBe(nurseUser.id);
    });

    it("should reject critical vitals without is_override", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", nurseCookie)
        .send({
          temperature: 40.0, // High fever
        });

      expect(res.status).toBe(400); // Bad Request (Joi Validation Error)
      expect(res.body.message).toMatch(/is_override to true/);
    });

    it("should allow critical vitals with is_override and override_reason", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", nurseCookie)
        .send({
          temperature: 40.0,
          is_override: true,
          override_reason: "Patient has severe infection",
        });

      expect(res.status).toBe(201);
      expect(res.body.temperature).toBe("40");
      expect(res.body.isOverride).toBe(true);
    });

    it("should reject critical vitals with is_override but missing reason", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", nurseCookie)
        .send({
          temperature: 40.0,
          is_override: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/override_reason is required/);
    });

    it("should reject vitals outside strictly allowed database/joi boundaries", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", nurseCookie)
        .send({
          temperature: 50.0, // Impossible physical boundary
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at most 45.0/);
    });
  });

  describe("GET /admissions/:id/vitals", () => {
    beforeEach(async () => {
      await prisma.vitalSign.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: nurseUser.id,
          temperature: 36.5,
          pulse: 75,
        },
      });
      // Wait a moment so recordedAt is different if needed, though they are ordered by desc
      await new Promise(resolve => setTimeout(resolve, 10));
      await prisma.vitalSign.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: nurseUser.id,
          temperature: 37.2,
          pulse: 82,
        },
      });
    });

    it("should retrieve vitals with descending order", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/vitals`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0].temperature).toBe("37.2"); // Most recent
      expect(res.body[1].temperature).toBe("36.5"); // Older
      expect(res.body[0].recordedBy).toHaveProperty("id", nurseUser.id);
    });
    
    it("should apply limit query parameter", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/vitals?limit=1`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].temperature).toBe("37.2");
    });
  });

  describe("PATCH /vitals/:id", () => {
    let testVitalId;

    beforeEach(async () => {
      const vs = await prisma.vitalSign.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: nurseUser.id,
          temperature: 36.5,
          pulse: 60,
        },
      });
      testVitalId = vs.id;
    });

    it("should archive old vitals and create new one as resident (append-only correction)", async () => {
      const res = await request(app)
        .patch(`/api/vitals/${testVitalId}`)
        .set("Cookie", residentCookie)
        .send({
          pulse: 65,
        });

      expect(res.status).toBe(200);
      expect(res.body.pulse).toBe(65);
      expect(res.body.temperature).toBe("36.5"); // Kept old value
      expect(res.body.recordedById).toBe(residentUser.id); // Authorship changed

      const newId = res.body.id;
      expect(newId).not.toBe(testVitalId);

      const oldVs = await prisma.vitalSign.findUnique({ where: { id: testVitalId } });
      expect(oldVs.isArchived).toBe(true);
    });

    it("should deny nurse from updating vitals", async () => {
      const res = await request(app)
        .patch(`/api/vitals/${testVitalId}`)
        .set("Cookie", nurseCookie)
        .send({ pulse: 65 });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /vitals/:id", () => {
    let testVitalId;

    beforeEach(async () => {
      const vs = await prisma.vitalSign.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: nurseUser.id,
          temperature: 37.0,
        },
      });
      testVitalId = vs.id;
    });

    it("should soft-delete vitals as resident", async () => {
      const res = await request(app)
        .delete(`/api/vitals/${testVitalId}`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(204);

      const dbVs = await prisma.vitalSign.findUnique({ where: { id: testVitalId } });
      expect(dbVs.isArchived).toBe(true);
    });

    it("should deny nurse from deleting vitals", async () => {
      const res = await request(app)
        .delete(`/api/vitals/${testVitalId}`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(403);
    });
  });
});
