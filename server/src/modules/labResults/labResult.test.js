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
  await prisma.labResult.deleteMany({
    where: {
      admission: {
        patient: {
          mrn: { startsWith: "LAB-TEST-" }
        }
      }
    }
  });
  await prisma.admissionNurse.deleteMany({
    where: {
      admission: {
        patient: {
          mrn: { startsWith: "LAB-TEST-" }
        }
      }
    }
  });
  await prisma.admission.deleteMany({
    where: {
      patient: {
        mrn: { startsWith: "LAB-TEST-" }
      }
    }
  });
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "LAB-TEST-" } } });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "LAB-" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Lab Results API", () => {
  let residentCookie;
  let residentUser;
  let nurseCookie;
  let testAdmissionId;
  let testPatientId;
  let testBedId;

  beforeAll(async () => {
    const resident = await generateTokenForRole("resident-lab@test.com", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${resident.token}`;
    residentUser = resident.user;

    const nurse = await generateTokenForRole("nurse-lab@test.com", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurse.token}`;
  });

  beforeEach(async () => {
    const patient = await prisma.patient.create({
      data: { mrn: "LAB-TEST-001", name: "LAB Test Patient", age: 40 },
    });
    testPatientId = patient.id;

    const bed = await prisma.bed.create({
      data: { bedNumber: "LAB-01", status: "OCCUPIED" },
    });
    testBedId = bed.id;

    const admission = await prisma.admission.create({
      data: { patientId: testPatientId, bedId: testBedId, doctorId: residentUser.id, status: "ACTIVE" },
    });
    testAdmissionId = admission.id;
  });

  describe("POST /admissions/:id/labs", () => {
    it("should allow resident to record a lab result", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie)
        .send({ test_name: "Hemoglobin", result_value: "9.2 g/dL", abnormal: true });

      expect(res.status).toBe(201);
      expect(res.body.testName).toBe("Hemoglobin");
      expect(res.body.resultValue).toBe("9.2 g/dL");
      expect(res.body.abnormal).toBe(true);
      expect(res.body.recordedById).toBe(residentUser.id);
      expect(res.body.recordedBy).toMatchObject({ id: residentUser.id, role: "MEDICAL_RESIDENT" });
    });

    it("should default abnormal to false when omitted", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie)
        .send({ test_name: "WBC", result_value: "6.5" });

      expect(res.status).toBe(201);
      expect(res.body.abnormal).toBe(false);
    });

    it("should allow specialist to record a lab result", async () => {
      const specialist = await generateTokenForRole("specialist-lab@test.com", "ICU_SPECIALIST");
      const specialistCookie = `${COOKIE_NAME}=${specialist.token}`;

      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", specialistCookie)
        .send({ test_name: "Glucose", result_value: "110 mg/dL", abnormal: false });

      expect(res.status).toBe(201);
      expect(res.body.recordedById).toBe(specialist.user.id);
    });

    it("should allow nurse to record a lab result", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", nurseCookie)
        .send({ test_name: "Sodium", result_value: "138 mmol/L", abnormal: false });

      expect(res.status).toBe(201);
      expect(res.body.recordedById).not.toBe(residentUser.id);
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .send({ test_name: "WBC", result_value: "6.5", abnormal: false });

      expect(res.status).toBe(401);
    });

    it("should reject missing test_name", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie)
        .send({ result_value: "6.5", abnormal: false });

      expect(res.status).toBe(400);
    });

    it("should reject missing result_value", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie)
        .send({ test_name: "WBC", abnormal: false });

      expect(res.status).toBe(400);
    });

    it("should return 404 for unknown admission", async () => {
      const res = await request(app)
        .post(`/api/admissions/00000000-0000-0000-0000-000000000000/labs`)
        .set("Cookie", residentCookie)
        .send({ test_name: "WBC", result_value: "6.5", abnormal: false });

      expect(res.status).toBe(404);
    });

    it("should return 409 for an inactive admission", async () => {
      await prisma.admission.update({
        where: { id: testAdmissionId },
        data: { status: "DISCHARGED" },
      });

      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie)
        .send({ test_name: "WBC", result_value: "6.5", abnormal: false });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /admissions/:id/labs", () => {
    beforeEach(async () => {
      await prisma.labResult.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: residentUser.id,
          testName: "Hemoglobin",
          resultValue: "9.2 g/dL",
          abnormal: true,
          recordedAt: new Date("2026-07-10T10:00:00Z"),
        },
      });
      await prisma.labResult.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: residentUser.id,
          testName: "Sodium",
          resultValue: "138 mmol/L",
          abnormal: false,
          recordedAt: new Date("2026-07-15T10:00:00Z"),
        },
      });
    });

    it("should allow nurse to list lab results and include the recording clinician", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].testName).toBe("Sodium"); // ordered desc by recordedAt
      expect(res.body[0].recordedBy).toMatchObject({
        id: residentUser.id,
        role: "MEDICAL_RESIDENT",
      });
    });

    it("should filter by abnormal=true", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/labs?abnormal=true`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].testName).toBe("Hemoglobin");
      expect(res.body[0].abnormal).toBe(true);
    });

    it("should filter by date range", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/labs?from=2026-07-14&to=2026-07-16`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].testName).toBe("Sodium");
    });

    it("should exclude archived lab results", async () => {
      await prisma.labResult.updateMany({
        where: { testName: "Sodium", admissionId: testAdmissionId },
        data: { isArchived: true, archivedAt: new Date() },
      });

      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/labs`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].testName).toBe("Hemoglobin");
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/labs`);

      expect(res.status).toBe(401);
    });

    it("should return 404 for unknown admission", async () => {
      const res = await request(app)
        .get(`/api/admissions/00000000-0000-0000-0000-000000000000/labs`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /labs/:id", () => {
    let testLabId;

    beforeEach(async () => {
      const lab = await prisma.labResult.create({
        data: {
          admissionId: testAdmissionId,
          recordedById: residentUser.id,
          testName: "Potassium",
          resultValue: "4.0 mmol/L",
          abnormal: false,
        },
      });
      testLabId = lab.id;
    });

    it("should allow resident to soft-archive a lab result", async () => {
      const res = await request(app)
        .delete(`/api/labs/${testLabId}`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(204);

      const archived = await prisma.labResult.findUnique({ where: { id: testLabId } });
      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).not.toBeNull();
    });

    it("should allow specialist to soft-archive a lab result", async () => {
      const specialist = await generateTokenForRole("specialist-del-lab@test.com", "ICU_SPECIALIST");
      const specialistCookie = `${COOKIE_NAME}=${specialist.token}`;

      const res = await request(app)
        .delete(`/api/labs/${testLabId}`)
        .set("Cookie", specialistCookie);

      expect(res.status).toBe(204);
    });

    it("should deny nurse from deleting a lab result", async () => {
      const res = await request(app)
        .delete(`/api/labs/${testLabId}`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(403);
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app)
        .delete(`/api/labs/${testLabId}`);

      expect(res.status).toBe(401);
    });

    it("should return 404 for unknown lab result", async () => {
      const res = await request(app)
        .delete(`/api/labs/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(404);
    });

    it("should return 409 for an already archived lab result", async () => {
      await prisma.labResult.update({
        where: { id: testLabId },
        data: { isArchived: true, archivedAt: new Date() },
      });

      const res = await request(app)
        .delete(`/api/labs/${testLabId}`)
        .set("Cookie", residentCookie);

      expect(res.status).toBe(409);
    });
  });
});
