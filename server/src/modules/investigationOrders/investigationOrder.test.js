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
  await prisma.investigationOrder.deleteMany({});
  await prisma.admissionNurse.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "INV-TEST-" } } });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "INV-" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Investigation Orders API", () => {
  let residentCookie;
  let residentUser;
  let nurseCookie;
  let testAdmissionId;
  let testPatientId;
  let testBedId;

  beforeAll(async () => {
    const resident = await generateTokenForRole("resident-inv@test.com", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${resident.token}`;
    residentUser = resident.user;

    const nurse = await generateTokenForRole("nurse-inv@test.com", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurse.token}`;
  });

  beforeEach(async () => {
    const patient = await prisma.patient.create({
      data: { mrn: "INV-TEST-001", name: "INV Test Patient", age: 40 },
    });
    testPatientId = patient.id;

    const bed = await prisma.bed.create({
      data: { bedNumber: "INV-01", status: "OCCUPIED" },
    });
    testBedId = bed.id;

    const admission = await prisma.admission.create({
      data: { patientId: testPatientId, bedId: testBedId, doctorId: residentUser.id, status: "ACTIVE" },
    });
    testAdmissionId = admission.id;
  });

  describe("POST /admissions/:id/investigation-orders", () => {
    it("should allow resident to place an investigation order", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", residentCookie)
        .send({ order_name: "Complete Blood Count", type: "Lab" });

      expect(res.status).toBe(201);
      expect(res.body.orderName).toBe("Complete Blood Count");
      expect(res.body.type).toBe("Lab");
      expect(res.body.status).toBe("Pending");
      expect(res.body.orderedById).toBe(residentUser.id);
    });

    it("should allow specialist to place an investigation order", async () => {
      const specialist = await generateTokenForRole("specialist-inv@test.com", "ICU_SPECIALIST");
      const specialistCookie = `${COOKIE_NAME}=${specialist.token}`;

      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", specialistCookie)
        .send({ order_name: "Chest X-Ray", type: "Radiology" });

      expect(res.status).toBe(201);
      expect(res.body.orderedById).toBe(specialist.user.id);
    });

    it("should deny nurse from placing an investigation order", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", nurseCookie)
        .send({ order_name: "CBC", type: "Lab" });

      expect(res.status).toBe(403);
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .send({ order_name: "CBC", type: "Lab" });

      expect(res.status).toBe(401);
    });

    it("should reject missing order_name", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", residentCookie)
        .send({ type: "Lab" });

      expect(res.status).toBe(400);
    });

    it("should reject missing type", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", residentCookie)
        .send({ order_name: "CBC" });

      expect(res.status).toBe(400);
    });

    it("should return 404 for unknown admission", async () => {
      const res = await request(app)
        .post(`/api/admissions/00000000-0000-0000-0000-000000000000/investigation-orders`)
        .set("Cookie", residentCookie)
        .send({ order_name: "CBC", type: "Lab" });

      expect(res.status).toBe(404);
    });

    it("should return 409 for an inactive admission", async () => {
      await prisma.admission.update({
        where: { id: testAdmissionId },
        data: { status: "DISCHARGED" },
      });

      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", residentCookie)
        .send({ order_name: "CBC", type: "Lab" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /admissions/:id/investigation-orders", () => {
    it("should allow nurse to list orders and include the ordering clinician", async () => {
      await prisma.investigationOrder.create({
        data: {
          admissionId: testAdmissionId,
          orderedById: residentUser.id,
          orderName: "CBC",
          type: "Lab",
          status: "Pending",
        },
      });

      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/investigation-orders`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].orderName).toBe("CBC");
      expect(res.body[0].orderedBy).toMatchObject({
        id: residentUser.id,
        role: "MEDICAL_RESIDENT",
      });
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/investigation-orders`);

      expect(res.status).toBe(401);
    });

    it("should return 404 for unknown admission", async () => {
      const res = await request(app)
        .get(`/api/admissions/00000000-0000-0000-0000-000000000000/investigation-orders`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /investigation-orders/:id", () => {
    let testOrderId;

    beforeEach(async () => {
      const order = await prisma.investigationOrder.create({
        data: {
          admissionId: testAdmissionId,
          orderedById: residentUser.id,
          orderName: "CT Head",
          type: "Radiology",
          status: "Pending",
        },
      });
      testOrderId = order.id;
    });

    it("should allow resident to mark an order as Completed", async () => {
      const res = await request(app)
        .patch(`/api/investigation-orders/${testOrderId}`)
        .set("Cookie", residentCookie)
        .send({ status: "Completed" });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testOrderId);
      expect(res.body.status).toBe("Completed");
    });

    it("should reject an invalid status value", async () => {
      const res = await request(app)
        .patch(`/api/investigation-orders/${testOrderId}`)
        .set("Cookie", residentCookie)
        .send({ status: "Cancelled" });

      expect(res.status).toBe(400);
    });

    it("should reject missing status", async () => {
      const res = await request(app)
        .patch(`/api/investigation-orders/${testOrderId}`)
        .set("Cookie", residentCookie)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should deny nurse from updating an order", async () => {
      const res = await request(app)
        .patch(`/api/investigation-orders/${testOrderId}`)
        .set("Cookie", nurseCookie)
        .send({ status: "Completed" });

      expect(res.status).toBe(403);
    });

    it("should return 404 for unknown order", async () => {
      const res = await request(app)
        .patch(`/api/investigation-orders/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", residentCookie)
        .send({ status: "Completed" });

      expect(res.status).toBe(404);
    });
  });
});
