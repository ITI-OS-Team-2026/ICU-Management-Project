const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");

require("dotenv").config();

const COOKIE_NAME = config.cookieName;

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
  await prisma.admissionNurse.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({ where: { mrn: { startsWith: "ADM-TEST-" } } });
  await prisma.bed.deleteMany({ where: { bedNumber: { startsWith: "ZT" } } });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Admissions & Nurse Assignment API", () => {
  let nurseCookie;
  let nurseUser;
  let residentCookie;
  let specialistCookie;
  let specialistUser;
  let adminCookie;
  let otherNurseCookie;
  let otherNurseUser;

  beforeAll(async () => {
    const nurseAuth = await generateTokenForRole("adm-test-nurse@smartcare.icu", "ICU_NURSE");
    nurseCookie = `${COOKIE_NAME}=${nurseAuth.token}`;
    nurseUser = nurseAuth.user;

    const residentAuth = await generateTokenForRole("adm-test-resident@smartcare.icu", "MEDICAL_RESIDENT");
    residentCookie = `${COOKIE_NAME}=${residentAuth.token}`;

    const specialistAuth = await generateTokenForRole("adm-test-specialist@smartcare.icu", "ICU_SPECIALIST");
    specialistCookie = `${COOKIE_NAME}=${specialistAuth.token}`;
    specialistUser = specialistAuth.user;

    const adminAuth = await generateTokenForRole("adm-test-admin@smartcare.icu", "SYSTEM_ADMIN");
    adminCookie = `${COOKIE_NAME}=${adminAuth.token}`;

    const otherNurseAuth = await generateTokenForRole("adm-test-nurse2@smartcare.icu", "ICU_NURSE");
    otherNurseCookie = `${COOKIE_NAME}=${otherNurseAuth.token}`;
    otherNurseUser = otherNurseAuth.user;
  });

  async function createFixtures(suffix = "1") {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const patient = await prisma.patient.create({
      data: {
        mrn: `ADM-TEST-${suffix}-${unique}`.slice(0, 50),
        name: `Admission Patient ${suffix}`,
        age: 55,
      },
    });
    const bed = await prisma.bed.create({
      data: {
        bedNumber: `ZT${unique}`.slice(0, 20),
        status: "AVAILABLE",
      },
    });
    return { patient, bed };
  }

  describe("POST /api/admissions", () => {
    it("should create an admission and occupy the bed", async () => {
      const { patient, bed } = await createFixtures("create");

      const res = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
          admission_reason: "Respiratory failure",
          chief_complaint: "Shortness of breath",
          provisional_diagnosis: "ARDS",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.patient_id).toBe(patient.id);
      expect(res.body.bed_id).toBe(bed.id);
      expect(res.body.doctor_id).toBe(specialistUser.id);
      expect(res.body.status).toBe("ACTIVE");
      expect(res.body.admission_reason).toBe("Respiratory failure");

      const updatedBed = await prisma.bed.findUnique({ where: { id: bed.id } });
      expect(updatedBed.status).toBe("OCCUPIED");
    });

    it("should reject when bed is already occupied by an active admission", async () => {
      const { patient, bed } = await createFixtures("conflict");
      const patient2 = await prisma.patient.create({
        data: {
          mrn: `ADM-TEST-c2-${Date.now().toString(36)}`.slice(0, 50),
          name: "Second Patient",
          age: 40,
        },
      });

      await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      const res = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient2.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      expect(res.statusCode).toBe(409);
    });

    it("should reject non-specialist doctor_id", async () => {
      const { patient, bed } = await createFixtures("baddoc");

      const res = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: nurseUser.id,
        });

      expect(res.statusCode).toBe(400);
    });

    it("should fail validation when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({ patient_id: "not-a-uuid" });

      expect(res.statusCode).toBe(400);
    });

    it("should reject SYSTEM_ADMIN", async () => {
      const { patient, bed } = await createFixtures("admin");

      const res = await request(app)
        .post("/api/admissions")
        .set("Cookie", adminCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/admissions", () => {
    it("should list admissions and filter by status/bed_id", async () => {
      const { patient, bed } = await createFixtures("list");
      await request(app)
        .post("/api/admissions")
        .set("Cookie", residentCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      const allRes = await request(app)
        .get("/api/admissions")
        .set("Cookie", nurseCookie);

      expect(allRes.statusCode).toBe(200);
      expect(allRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(allRes.body.meta).toHaveProperty("total");

      const filtered = await request(app)
        .get(`/api/admissions?status=ACTIVE&bed_id=${bed.id}`)
        .set("Cookie", nurseCookie);

      expect(filtered.statusCode).toBe(200);
      expect(filtered.body.data.every((a) => a.status === "ACTIVE" && a.bed_id === bed.id)).toBe(true);
    });
  });

  describe("GET /api/admissions/:id", () => {
    it("should return a single admission", async () => {
      const { patient, bed } = await createFixtures("get");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
          chief_complaint: "Chest pain",
        });

      const res = await request(app)
        .get(`/api/admissions/${created.body.id}`)
        .set("Cookie", specialistCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.chief_complaint).toBe("Chest pain");
    });

    it("should return 404 for unknown id", async () => {
      const res = await request(app)
        .get("/api/admissions/00000000-0000-0000-0000-000000000000")
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/admissions/:id/discharge", () => {
    it("should discharge an active admission and free the bed (specialist only)", async () => {
      const { patient, bed } = await createFixtures("discharge");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      const res = await request(app)
        .patch(`/api/admissions/${created.body.id}/discharge`)
        .set("Cookie", specialistCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("DISCHARGED");
      expect(res.body.discharged_at).toBeTruthy();

      const updatedBed = await prisma.bed.findUnique({ where: { id: bed.id } });
      expect(updatedBed.status).toBe("AVAILABLE");
    });

    it("should reject discharge by nurse", async () => {
      const { patient, bed } = await createFixtures("dischargedeny");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      const res = await request(app)
        .patch(`/api/admissions/${created.body.id}/discharge`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(403);
    });

    it("should return 409 when discharging a non-active admission", async () => {
      const { patient, bed } = await createFixtures("discharge409");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      await request(app)
        .patch(`/api/admissions/${created.body.id}/discharge`)
        .set("Cookie", specialistCookie);

      const res = await request(app)
        .patch(`/api/admissions/${created.body.id}/discharge`)
        .set("Cookie", specialistCookie);

      expect(res.statusCode).toBe(409);
    });
  });

  describe("DELETE /api/admissions/:id", () => {
    it("should soft-archive an admission (specialist only)", async () => {
      const { patient, bed } = await createFixtures("archive");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });

      const res = await request(app)
        .delete(`/api/admissions/${created.body.id}`)
        .set("Cookie", specialistCookie);

      expect(res.statusCode).toBe(204);

      const archived = await prisma.admission.findUnique({ where: { id: created.body.id } });
      expect(archived.isArchived).toBe(true);
      expect(archived.status).toBe("ARCHIVED");

      const updatedBed = await prisma.bed.findUnique({ where: { id: bed.id } });
      expect(updatedBed.status).toBe("AVAILABLE");
    });
  });

  describe("Nurse assignment", () => {
    let admissionId;

    beforeEach(async () => {
      const { patient, bed } = await createFixtures("nurse");
      const created = await request(app)
        .post("/api/admissions")
        .set("Cookie", nurseCookie)
        .send({
          patient_id: patient.id,
          bed_id: bed.id,
          doctor_id: specialistUser.id,
        });
      admissionId = created.body.id;
    });

    it("should allow nurse to assign themselves", async () => {
      const res = await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: nurseUser.id });

      expect(res.statusCode).toBe(201);
      expect(res.body.nurse_id).toBe(nurseUser.id);
      expect(res.body.unassigned_at).toBeNull();
    });

    it("should allow specialist to assign any nurse", async () => {
      const res = await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", specialistCookie)
        .send({ nurse_id: otherNurseUser.id });

      expect(res.statusCode).toBe(201);
      expect(res.body.nurse_id).toBe(otherNurseUser.id);
    });

    it("should prevent nurse from assigning another nurse", async () => {
      const res = await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: otherNurseUser.id });

      expect(res.statusCode).toBe(403);
    });

    it("should reject duplicate active assignment", async () => {
      await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: nurseUser.id });

      const res = await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: nurseUser.id });

      expect(res.statusCode).toBe(409);
    });

    it("should list current and historical nurse assignments", async () => {
      await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: nurseUser.id });

      await request(app)
        .delete(`/api/admissions/${admissionId}/nurses/${nurseUser.id}`)
        .set("Cookie", nurseCookie);

      await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", specialistCookie)
        .send({ nurse_id: otherNurseUser.id });

      const res = await request(app)
        .get(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", residentCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((a) => a.unassigned_at !== null)).toBe(true);
      expect(res.body.some((a) => a.unassigned_at === null)).toBe(true);
    });

    it("should unassign nurse (set unassigned_at)", async () => {
      await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", nurseCookie)
        .send({ nurse_id: nurseUser.id });

      const res = await request(app)
        .delete(`/api/admissions/${admissionId}/nurses/${nurseUser.id}`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(204);

      const assignment = await prisma.admissionNurse.findFirst({
        where: { admissionId, nurseId: nurseUser.id },
      });
      expect(assignment.unassignedAt).not.toBeNull();
    });

    it("should prevent nurse from unassigning another nurse", async () => {
      await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", specialistCookie)
        .send({ nurse_id: otherNurseUser.id });

      const res = await request(app)
        .delete(`/api/admissions/${admissionId}/nurses/${otherNurseUser.id}`)
        .set("Cookie", nurseCookie);

      expect(res.statusCode).toBe(403);
    });

    it("should reject nurse assignment by resident", async () => {
      const res = await request(app)
        .post(`/api/admissions/${admissionId}/nurses`)
        .set("Cookie", residentCookie)
        .send({ nurse_id: nurseUser.id });

      expect(res.statusCode).toBe(403);
    });
  });
});
