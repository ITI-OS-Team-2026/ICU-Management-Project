const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");

require("dotenv").config();

const COOKIE_NAME = config.cookieName;

// Helper to generate a token for tests
const generateTokenForRole = async (email, role) => {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        firstName: "Test",
        lastName: role,
        passwordHash: "dummyhash",
        role
      }
    });
  }
  return jwt.sign({ id: user.id, role }, config.jwtSecret, { expiresIn: "12h" });
};

async function cleanupTestData() {
  await prisma.allergy.deleteMany({});
  await prisma.medicalHistory.deleteMany({});
  await prisma.patient.deleteMany({});
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Patients, Allergies & Medical History API", () => {
  let nurseCookie;
  let residentCookie;
  let specialistCookie;
  let adminCookie;

  beforeAll(async () => {
    const nurseEmail = process.env.SEED_NURSE_EMAIL || "nurse@smartcare.icu";
    const nurseToken = await generateTokenForRole(nurseEmail.toLowerCase(), "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurseToken}`;

    const residentEmail = process.env.SEED_RESIDENT_EMAIL || "resident@smartcare.icu";
    const residentToken = await generateTokenForRole(residentEmail.toLowerCase(), "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${residentToken}`;

    const specialistEmail = process.env.SEED_SPECIALIST_EMAIL || "specialist@smartcare.icu";
    const specialistToken = await generateTokenForRole(specialistEmail.toLowerCase(), "ICU_SPECIALIST");
    specialistCookie = `${COOKIE_NAME}=${specialistToken}`;

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@smartcare.icu";
    const adminToken = await generateTokenForRole(adminEmail.toLowerCase(), "SYSTEM_ADMIN");
    adminCookie = `${COOKIE_NAME}=${adminToken}`;
  });

  describe("POST /api/patients", () => {
    it("should allow nurse, resident, specialist to create patient", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Cookie", nurseCookie)
        .send({
          mrn: "MRN-123456",
          national_id: "NAT-7890",
          name: "John Doe",
          age: 45,
          gender: "Male",
          residence: "Cairo, Egypt",
          occupation: "Engineer",
          marital_status: "MARRIED",
          handedness: "RIGHT"
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.mrn).toBe("MRN-123456");
      expect(res.body.name).toBe("John Doe");
      expect(res.body.age).toBe(45);
    });

    it("should reject creation if MRN already exists", async () => {
      // Create first patient
      await request(app)
        .post("/api/patients")
        .set("Cookie", nurseCookie)
        .send({
          mrn: "MRN-DUP",
          name: "Alice",
          age: 30
        });

      // Try creating second patient with same MRN
      const res = await request(app)
        .post("/api/patients")
        .set("Cookie", nurseCookie)
        .send({
          mrn: "MRN-DUP",
          name: "Bob",
          age: 35
        });

      expect(res.statusCode).toBe(409);
    });

    it("should fail validation if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Cookie", nurseCookie)
        .send({
          mrn: "MRN-FAIL"
          // name and age are missing
        });

      expect(res.statusCode).toBe(400);
    });

    it("should reject access for non-clinical roles (SYSTEM_ADMIN)", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Cookie", adminCookie)
        .send({
          mrn: "MRN-ADMIN",
          name: "Jack",
          age: 50
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/patients", () => {
    let patient1, patient2;

    beforeEach(async () => {
      patient1 = await prisma.patient.create({
        data: { mrn: "MRN-A1", name: "Steve Rogers", age: 100 }
      });
      patient2 = await prisma.patient.create({
        data: { mrn: "MRN-B2", name: "Tony Stark", age: 48 }
      });
    });

    it("should return a list of patients", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it("should search patients by name", async () => {
      const res = await request(app)
        .get("/api/patients?name=Rogers")
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Steve Rogers");
    });

    it("should filter out archived patients by default", async () => {
      // Archive patient2
      await prisma.patient.update({
        where: { id: patient2.id },
        data: { isArchived: true, archivedAt: new Date() }
      });

      const resDefault = await request(app)
        .get("/api/patients")
        .set("Cookie", nurseCookie);

      expect(resDefault.body.data.length).toBe(1);
      expect(resDefault.body.data[0].id).toBe(patient1.id);

      const resArchived = await request(app)
        .get("/api/patients?include_archived=true")
        .set("Cookie", nurseCookie);

      expect(resArchived.body.data.length).toBe(2);
    });
  });

  describe("GET /api/patients/:id", () => {
    it("should return patient by id", async () => {
      const patient = await prisma.patient.create({
        data: { mrn: "MRN-ID", name: "Bruce Banner", age: 40 }
      });

      const res = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("Bruce Banner");
    });

    it("should return 404 if patient not found", async () => {
      const res = await request(app)
        .get("/api/patients/00000000-0000-0000-0000-000000000000")
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/patients/:id", () => {
    let patient;

    beforeEach(async () => {
      patient = await prisma.patient.create({
        data: { mrn: "MRN-DEL", name: "Natasha", age: 35 }
      });
    });

    it("should allow specialist to soft-delete patient", async () => {
      const res = await request(app)
        .delete(`/api/patients/${patient.id}`)
        .set("Cookie", specialistCookie);

      expect(res.statusCode).toBe(204);

      const check = await prisma.patient.findUnique({ where: { id: patient.id } });
      expect(check.isArchived).toBe(true);
      expect(check.archivedAt).not.toBeNull();
    });

    it("should reject soft-delete for nurse or resident", async () => {
      const res = await request(app)
        .delete(`/api/patients/${patient.id}`)
        .set("Cookie", residentCookie);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("Allergies endpoints", () => {
    let patient;

    beforeEach(async () => {
      patient = await prisma.patient.create({
        data: { mrn: "MRN-ALLERGY", name: "Peter Parker", age: 20 }
      });
    });

    it("should add an allergy to patient", async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/allergies`)
        .set("Cookie", nurseCookie)
        .send({
          allergen: "Peanuts",
          severity: "HIGH"
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.allergen).toBe("Peanuts");
      expect(res.body.severity).toBe("HIGH");
      expect(res.body.patient_id).toBe(patient.id);
    });

    it("should list allergies for a patient", async () => {
      await prisma.allergy.create({
        data: { patientId: patient.id, allergen: "Penicillin", severity: "MEDIUM" }
      });

      const res = await request(app)
        .get(`/api/patients/${patient.id}/allergies`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].allergen).toBe("Penicillin");
    });

    it("should allow resident/specialist to delete (soft-archive) allergy", async () => {
      const allergy = await prisma.allergy.create({
        data: { patientId: patient.id, allergen: "Dust" }
      });

      const res = await request(app)
        .delete(`/api/allergies/${allergy.id}`)
        .set("Cookie", residentCookie);

      expect(res.statusCode).toBe(204);

      const check = await prisma.allergy.findUnique({ where: { id: allergy.id } });
      expect(check.isArchived).toBe(true);
    });

    it("should reject allergy deletion for nurse", async () => {
      const allergy = await prisma.allergy.create({
        data: { patientId: patient.id, allergen: "Dust" }
      });

      const res = await request(app)
        .delete(`/api/allergies/${allergy.id}`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("Medical History endpoints", () => {
    let patient;

    beforeEach(async () => {
      patient = await prisma.patient.create({
        data: { mrn: "MRN-HISTORY", name: "Wanda", age: 30 }
      });
    });

    it("should create medical history for patient", async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/medical-history`)
        .set("Cookie", residentCookie)
        .send({
          diabetes_dm: true,
          hypertension_htn: false,
          past_similar_conditions: "None",
          past_diseases: ["Asthma"],
          previous_operations: true,
          operations_details: "Appendix removal",
          has_allergies: true,
          traveled_abroad: false,
          consanguinity: false,
          family_similar_conditions: "Heart disease in father",
          inherited_diseases: { diabetes: true }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.diabetes_dm).toBe(true);
      expect(res.body.past_diseases).toEqual(["Asthma"]);
      expect(res.body.operations_details).toBe("Appendix removal");
    });

    it("should return 409 if medical history already exists", async () => {
      await prisma.medicalHistory.create({
        data: { patientId: patient.id, diabetesDm: false }
      });

      const res = await request(app)
        .post(`/api/patients/${patient.id}/medical-history`)
        .set("Cookie", residentCookie)
        .send({
          diabetes_dm: true
        });

      expect(res.statusCode).toBe(409);
    });

    it("should get medical history for patient", async () => {
      await prisma.medicalHistory.create({
        data: { patientId: patient.id, diabetesDm: true, hypertensionHtn: true }
      });

      const res = await request(app)
        .get(`/api/patients/${patient.id}/medical-history`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.diabetes_dm).toBe(true);
      expect(res.body.hypertension_htn).toBe(true);
    });

    it("should patch medical history fields", async () => {
      await prisma.medicalHistory.create({
        data: { patientId: patient.id, diabetesDm: true, traveledAbroad: false }
      });

      const res = await request(app)
        .patch(`/api/patients/${patient.id}/medical-history`)
        .set("Cookie", residentCookie)
        .send({
          diabetes_dm: false,
          traveled_abroad: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.diabetes_dm).toBe(false);
      expect(res.body.traveled_abroad).toBe(true);
    });
  });
});
