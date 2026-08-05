const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

const EMAILS = {
  resident: "resident.treatment@example.com",
  specialist: "specialist.treatment@example.com",
  nurse: "nurse.treatment@example.com",
};

describe("Treatment Approvals API", () => {
  let residentToken, specialistToken, nurseToken;
  let testResident, testAdmission, testPatient, testBed;

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
    residentToken = await generateTokenForRole(EMAILS.resident, "MEDICAL_RESIDENT");
    specialistToken = await generateTokenForRole(EMAILS.specialist, "ICU_SPECIALIST");
    nurseToken = await generateTokenForRole(EMAILS.nurse, "ICU_NURSE");

    testResident = await prisma.user.findUnique({ where: { email: EMAILS.resident } });

    testPatient = await prisma.patient.create({
      data: {
        name: "Treatment Approval Patient",
        age: 52,
        mrn: "MRN-TREATMENT-123",
      },
    });

    testBed = await prisma.bed.create({
      data: {
        bedNumber: "BED-TREATMENT-1",
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
  });

  afterAll(async () => {
    await prisma.treatmentApproval.deleteMany({ where: { admissionId: testAdmission.id } });
    await prisma.notification.deleteMany({
      where: { user: { email: { in: Object.values(EMAILS) } } },
    });
    await prisma.admission.deleteMany({ where: { id: testAdmission.id } });
    await prisma.bed.deleteMany({ where: { bedNumber: "BED-TREATMENT-1" } });
    await prisma.patient.deleteMany({ where: { mrn: "MRN-TREATMENT-123" } });
    await prisma.user.deleteMany({ where: { email: { in: Object.values(EMAILS) } } });
  });

  describe("POST /api/admissions/:id/treatment-approvals", () => {
    it("should allow a resident to request a treatment approval", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          treatment_name: "Extracorporeal membrane oxygenation",
          clinical_justification: "Refractory hypoxaemia despite maximal ventilator support.",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.treatmentName).toBe("Extracorporeal membrane oxygenation");
      expect(res.body.data.approvalStatus).toBeNull();
      expect(res.body.data.requester.id).toBe(testResident.id);
    });

    it("should reject a request without a treatment name", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ clinical_justification: "No name supplied." });

      expect(res.statusCode).toBe(400);
    });

    it("should not allow a nurse to request a treatment approval", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmission.id}/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ treatment_name: "Nurse attempt" });

      expect(res.statusCode).toBe(403);
    });

    it("should return 404 for an unknown admission", async () => {
      const res = await request(app)
        .post(`/api/admissions/00000000-0000-0000-0000-000000000000/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ treatment_name: "Ghost admission" });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/admissions/:id/treatment-approvals", () => {
    it("should let a nurse read the approvals list", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it("should filter by pending status", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/treatment-approvals?status=PENDING`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it("should return an empty list when filtering by approved", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/treatment-approvals?status=APPROVED`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(0);
    });
  });

  describe("PATCH /api/treatment-approvals/:id", () => {
    let approvalId;

    beforeAll(async () => {
      const list = await request(app)
        .get(`/api/admissions/${testAdmission.id}/treatment-approvals`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);
      approvalId = list.body.data[0].id;
    });

    it("should not allow a resident to decide", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvalId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ approval_status: true });

      expect(res.statusCode).toBe(403);
    });

    it("should reject a non-boolean approval status", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvalId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ approval_status: "maybe" });

      expect(res.statusCode).toBe(400);
    });

    it("should allow a specialist to approve", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvalId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ approval_status: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.approvalStatus).toBe(true);
      expect(res.body.data.approvedAt).not.toBeNull();
      expect(res.body.data.approver.role).toBe("ICU_SPECIALIST");
    });

    it("should notify the requester of the decision", async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: testResident.id },
      });

      expect(notifications.some((n) => n.title === "Treatment approved")).toBe(true);
    });

    it("should refuse to decide the same approval twice", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvalId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ approval_status: false });

      expect(res.statusCode).toBe(409);
    });

    it("should return 404 for an unknown approval", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ approval_status: true });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/treatment-approvals/:id/execution", () => {
    let approvedId, pendingId, rejectedId;

    beforeAll(async () => {
      approvedId = (await prisma.treatmentApproval.create({
        data: {
          admissionId: testAdmission.id,
          requestedBy: testResident.id,
          treatmentName: "Executable treatment",
          approvalStatus: true,
          approvedAt: new Date(),
        },
      })).id;

      pendingId = (await prisma.treatmentApproval.create({
        data: {
          admissionId: testAdmission.id,
          requestedBy: testResident.id,
          treatmentName: "Still pending treatment",
        },
      })).id;

      rejectedId = (await prisma.treatmentApproval.create({
        data: {
          admissionId: testAdmission.id,
          requestedBy: testResident.id,
          treatmentName: "Rejected treatment",
          approvalStatus: false,
          approvedAt: new Date(),
        },
      })).id;
    });

    it("should not allow a specialist to record execution", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ execution_status: "IN_PROGRESS" });

      expect(res.statusCode).toBe(403);
    });

    it("should refuse to execute a treatment that is still pending approval", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${pendingId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "IN_PROGRESS" });

      expect(res.statusCode).toBe(409);
    });

    it("should refuse to execute a rejected treatment", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${rejectedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "IN_PROGRESS" });

      expect(res.statusCode).toBe(409);
    });

    it("should reject an invalid execution status", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "NOT_STARTED" });

      expect(res.statusCode).toBe(400);
    });

    it("should let a nurse start an approved treatment", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "IN_PROGRESS", execution_notes: "Line inserted, circuit primed." });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.executionStatus).toBe("IN_PROGRESS");
      expect(res.body.data.startedAt).not.toBeNull();
      expect(res.body.data.starter.role).toBe("ICU_NURSE");
      expect(res.body.data.completedAt).toBeNull();
    });

    it("should notify the requester that the treatment started", async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: testResident.id },
      });

      expect(notifications.some((n) => n.title === "Treatment started")).toBe(true);
    });

    it("should refuse to move backwards to IN_PROGRESS again", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "IN_PROGRESS" });

      expect(res.statusCode).toBe(409);
    });

    it("should let a nurse complete a started treatment", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "COMPLETED", execution_notes: "Ran 6 hours, tolerated well." });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.executionStatus).toBe("COMPLETED");
      expect(res.body.data.completedAt).not.toBeNull();
      expect(res.body.data.completer.role).toBe("ICU_NURSE");
      expect(res.body.data.executionNotes).toBe("Ran 6 hours, tolerated well.");
    });

    it("should refuse any further execution change once completed", async () => {
      const res = await request(app)
        .patch(`/api/treatment-approvals/${approvedId}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "COMPLETED" });

      expect(res.statusCode).toBe(409);
    });

    it("should stamp a start time when completing straight from NOT_STARTED", async () => {
      const quick = await prisma.treatmentApproval.create({
        data: {
          admissionId: testAdmission.id,
          requestedBy: testResident.id,
          treatmentName: "Quick procedure",
          approvalStatus: true,
          approvedAt: new Date(),
        },
      });

      const res = await request(app)
        .patch(`/api/treatment-approvals/${quick.id}/execution`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ execution_status: "COMPLETED" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.startedAt).not.toBeNull();
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it("should filter the list by execution status", async () => {
      const res = await request(app)
        .get(`/api/admissions/${testAdmission.id}/treatment-approvals?execution=COMPLETED`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(2);
    });
  });

  describe("DELETE /api/treatment-approvals/:id", () => {
    let pendingId;

    beforeEach(async () => {
      const created = await prisma.treatmentApproval.create({
        data: {
          admissionId: testAdmission.id,
          requestedBy: testResident.id,
          treatmentName: "Withdrawable treatment",
        },
      });
      pendingId = created.id;
    });

    it("should let the requester withdraw a pending request", async () => {
      const res = await request(app)
        .delete(`/api/treatment-approvals/${pendingId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(204);

      const archived = await prisma.treatmentApproval.findUnique({ where: { id: pendingId } });
      expect(archived.isArchived).toBe(true);
    });

    it("should not let another clinician withdraw someone else's request", async () => {
      const res = await request(app)
        .delete(`/api/treatment-approvals/${pendingId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
