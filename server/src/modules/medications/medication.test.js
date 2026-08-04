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

// Every delete is scoped to this suite's own MED-TEST- patients. An unscoped
// deleteMany({}) here will empty the whole ward if the suite is ever pointed at
// a shared database — which it was, and it did.
const testPatientFilter = { mrn: { startsWith: "MED-TEST-" } };
const testAdmissionFilter = { patient: testPatientFilter };

async function cleanupTestData() {
  await prisma.medicationAdministration.deleteMany({
    where: { medication: { admission: testAdmissionFilter } },
  });
  await prisma.medication.deleteMany({ where: { admission: testAdmissionFilter } });
  await prisma.admissionNurse.deleteMany({ where: { admission: testAdmissionFilter } });
  await prisma.admission.deleteMany({ where: testAdmissionFilter });
  await prisma.allergy.deleteMany({ where: { patient: testPatientFilter } });
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
          frequency: "OD",
          route: "PO",
        });

      expect(res.status).toBe(201);
      expect(res.body.drugName).toBe("Aspirin");
      expect(res.body.prescribedById).toBe(residentUser.id);
    });

    it("should deny nurse from prescribing medication", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", nurseCookie)
        .send({ drug_name: "Aspirin", dosage: "81mg", frequency: "OD", route: "PO" });

      expect(res.status).toBe(403);
    });

    it("should append-only update medication (discontinue)", async () => {
      const med = await prisma.medication.create({
        data: { admissionId: testAdmissionId, prescribedById: residentUser.id, drugName: "Aspirin", dosage: "81mg", frequency: "OD", route: "PO" }
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
        data: { admissionId: testAdmissionId, prescribedById: residentUser.id, drugName: "Aspirin", dosage: "81mg", frequency: "OD", route: "PO" }
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

    it("should reject a second log for the same dose slot", async () => {
      const slot = new Date();
      const payload = {
        status: "ADMINISTERED",
        administered_dose: "81mg",
        scheduled_time: slot.toISOString(),
      };

      const first = await request(app)
        .post(`/api/medications/${testMedId}/administrations`)
        .set("Cookie", nurseCookie)
        .send(payload);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`/api/medications/${testMedId}/administrations`)
        .set("Cookie", nurseCookie)
        .send(payload);

      expect(second.status).toBe(409);
      expect(second.body.message).toMatch(/already been recorded/);
    });
  });

  describe("Allergy safety", () => {
    beforeEach(async () => {
      await prisma.allergy.create({
        data: { patientId: testPatientId, allergen: "Penicillin", severity: "SEVERE" },
      });
    });

    it("should block a prescription that conflicts with a documented allergy", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", residentCookie)
        .send({ drug_name: "Benzylpenicillin", dosage: "1.2g", frequency: "Q6H", route: "IV" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Penicillin/);
    });

    it("should allow the prescription when the prescriber acknowledges the allergy", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", residentCookie)
        .send({
          drug_name: "Benzylpenicillin",
          dosage: "1.2g",
          frequency: "Q6H",
          route: "IV",
          acknowledge_allergy: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.allergyAcknowledged).toBe(true);
    });

    it("should not block an unrelated drug", async () => {
      const res = await request(app)
        .post(`/api/admissions/${testAdmissionId}/medications`)
        .set("Cookie", residentCookie)
        .send({ drug_name: "Paracetamol", dosage: "1g", frequency: "QDS", route: "PO" });

      expect(res.status).toBe(201);
      expect(res.body.allergyAcknowledged).toBe(false);
    });
  });

  describe("Discontinuation", () => {
    let testMedId;

    beforeEach(async () => {
      const med = await prisma.medication.create({
        data: {
          admissionId: testAdmissionId,
          prescribedById: residentUser.id,
          drugName: "Aspirin",
          dosage: "81mg",
          frequency: "OD",
          route: "PO",
        },
      });
      testMedId = med.id;
    });

    it("should require a reason to discontinue", async () => {
      const res = await request(app)
        .delete(`/api/medications/${testMedId}`)
        .set("Cookie", residentCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/discontinue_reason is required/);
    });

    it("should keep a discontinued order visible with its reason", async () => {
      const res = await request(app)
        .delete(`/api/medications/${testMedId}`)
        .set("Cookie", residentCookie)
        .send({ discontinue_reason: "Bleeding risk" });

      expect(res.status).toBe(204);

      const med = await prisma.medication.findUnique({ where: { id: testMedId } });
      expect(med.isActive).toBe(false);
      expect(med.isArchived).toBe(false); // still part of the patient's record
      expect(med.discontinueReason).toBe("Bleeding risk");
      expect(med.discontinuedById).toBe(residentUser.id);
    });

    it("should deny a nurse from discontinuing", async () => {
      const res = await request(app)
        .delete(`/api/medications/${testMedId}`)
        .set("Cookie", nurseCookie)
        .send({ discontinue_reason: "Bleeding risk" });

      expect(res.status).toBe(403);
    });
  });

  describe("MAR (dose schedule)", () => {
    it("should expand a TDS order into three dose slots for the day", async () => {
      await prisma.medication.create({
        data: {
          admissionId: testAdmissionId,
          prescribedById: residentUser.id,
          drugName: "Paracetamol",
          dosage: "1g",
          frequency: "TDS",
          route: "PO",
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/mar`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(200);
      expect(res.body.medications).toHaveLength(1);
      expect(res.body.medications[0].doses).toHaveLength(3);
      expect(res.body.medications[0].isScheduled).toBe(true);
    });

    it("should give a PRN order no scheduled slots", async () => {
      await prisma.medication.create({
        data: {
          admissionId: testAdmissionId,
          prescribedById: residentUser.id,
          drugName: "Morphine",
          dosage: "2.5mg",
          frequency: "PRN",
          route: "IV",
        },
      });

      const res = await request(app)
        .get(`/api/admissions/${testAdmissionId}/mar`)
        .set("Cookie", nurseCookie);

      expect(res.status).toBe(200);
      expect(res.body.medications[0].isScheduled).toBe(false);
      expect(res.body.medications[0].doses).toHaveLength(0);
    });
  });
});
