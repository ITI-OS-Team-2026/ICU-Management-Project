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
  await prisma.medicationAdministration.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.admissionNurse.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "MED-TEST-" } } });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "MED-" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Medications API", () => {
  let residentCookie;
  let residentUser;
  let nurseCookie;
  let nurseUser;
  let testAdmissionId;
  let testPatientId;
  let testBedId;

  beforeAll(async () => {
    const resident = await generateTokenForRole("resident-med@test.com", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${resident.token}`;
    residentUser = resident.user;

    const nurse = await generateTokenForRole("nurse-med@test.com", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurse.token}`;
    nurseUser = nurse.user;
  });

  beforeEach(async () => {
    const patient = await prisma.patient.create({
      data: { mrn: "MED-TEST-001", name: "MED Test Patient", age: 40 },
    });
    testPatientId = patient.id;

    const bed = await prisma.bed.create({
      data: { bedNumber: "MED-01", status: "OCCUPIED" },
    });
    testBedId = bed.id;

    const admission = await prisma.admission.create({
      data: { patientId: testPatientId, bedId: testBedId, doctorId: residentUser.id, status: "ACTIVE" },
    });
    testAdmissionId = admission.id;
  });

  describe("Prescriptions (Medications)", () => {
    it("should allow resident to prescribe a medication", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", residentCookie)
        .send({
          drug_name: "Aspirin",
          dosage: "81mg",
          frequency: "Daily",
        });

      expect(res.status).toBe(201);
      expect(res.body.drugName).toBe("Aspirin");
      expect(res.body.prescribedById).toBe(residentUser.id);
    });

    it("should deny nurse from prescribing medication", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", nurseCookie)
        .send({ drug_name: "Aspirin", dosage: "81mg", frequency: "Daily" });

      expect(res.status).toBe(403);
    });

    it("should append-only update medication (discontinue)", async () => {
      const med = await prisma.medication.create({
        data: { admissionId: testAdmissionId, prescribedById: residentUser.id, drugName: "Aspirin", dosage: "81mg", frequency: "Daily" }
      });

      const res = await request(app)
        .patch(`/api/medications/${med.id}`)
        .set("Cookie", residentCookie)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.id).not.toBe(med.id);
      expect(res.body.isActive).toBe(false);

      const oldMed = await prisma.medication.findUnique({ where: { id: med.id } });
      expect(oldMed.isArchived).toBe(true);
    });
  });

  describe("Administrations (eMAR)", () => {
    let testMedId;

    beforeEach(async () => {
      const med = await prisma.medication.create({
        data: { admissionId: testAdmissionId, prescribedById: residentUser.id, drugName: "Aspirin", dosage: "81mg", frequency: "Daily" }
      });
      testMedId = med.id;
    });

    it("should allow nurse to log ADMINISTERED dose", async () => {
      const res = await request(app)
        .post(`/api/medications/${testMedId}/administrations`)
        .set("Cookie", nurseCookie)
        .send({
          status: "ADMINISTERED",
          administered_dose: "81mg",
          scheduled_time: new Date().toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("ADMINISTERED");
    });

    it("should enforce notes if status is HELD", async () => {
      const res = await request(app)
        .post(`/api/medications/${testMedId}/administrations`)
        .set("Cookie", nurseCookie)
        .send({
          status: "HELD",
          scheduled_time: new Date().toISOString()
          // Missing notes
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Notes are required/);
    });

    it("should allow logging REFUSED with notes and no dose", async () => {
      const res = await request(app)
        .post(`/api/medications/${testMedId}/administrations`)
        .set("Cookie", nurseCookie)
        .send({
          status: "REFUSED",
          notes: "Patient refused to take it",
          scheduled_time: new Date().toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("REFUSED");
    });

    it("should allow nurse to append-only update an administration log with a modification_reason", async () => {
      const adminLog = await prisma.medicationAdministration.create({
        data: {
          medicationId: testMedId,
          administeredById: nurseUser.id,
          status: "ADMINISTERED",
          administeredDose: "81mg",
          scheduledTime: new Date()
        }
      });

      const res = await request(app)
        .patch(`/api/medication-administrations/${adminLog.id}`)
        .set("Cookie", nurseCookie)
        .send({
          administered_dose: "162mg",
          modification_reason: "Mistyped dose, gave two tablets."
        });

      expect(res.status).toBe(200);
      expect(res.body.id).not.toBe(adminLog.id);
      expect(res.body.administeredDose).toBe("162mg");
      expect(res.body.notes).toMatch(/Mistyped dose/);

      const oldLog = await prisma.medicationAdministration.findUnique({ where: { id: adminLog.id } });
      expect(oldLog.isArchived).toBe(true);
    });

    it("should deny updating without modification_reason", async () => {
      const adminLog = await prisma.medicationAdministration.create({
        data: { medicationId: testMedId, administeredById: nurseUser.id, status: "ADMINISTERED", administeredDose: "81mg", scheduledTime: new Date() }
      });

      const res = await request(app)
        .patch(`/api/medication-administrations/${adminLog.id}`)
        .set("Cookie", nurseCookie)
        .send({ administered_dose: "162mg" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/modification_reason is required/);
    });
  });
});
