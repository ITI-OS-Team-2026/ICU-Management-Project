const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");

require("dotenv").config();

// Test Helpers
const COOKIE_NAME = config.cookieName;

const generateAdminToken = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@smartcare.icu";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: "Sys",
        lastName: "Admin",
        passwordHash: "hash",
        role: "SYSTEM_ADMIN"
      }
    });
  }
  return jwt.sign({ id: admin.id, role: admin.role }, config.jwtSecret, { expiresIn: "12h" });
};

const generateNurseToken = async () => {
  const nurseEmail = process.env.SEED_NURSE_EMAIL || "nurse@smartcare.icu";
  let nurse = await prisma.user.findUnique({ where: { email: nurseEmail } });
  if (!nurse) {
    nurse = await prisma.user.create({
      data: {
        email: nurseEmail,
        firstName: "Test",
        lastName: "Nurse",
        passwordHash: "hash",
        role: "ICU_NURSE"
      }
    });
  }
  return jwt.sign({ id: nurse.id, role: nurse.role }, config.jwtSecret, { expiresIn: "12h" });
};

const PROTECTED_EMAILS = [
  process.env.SEED_ADMIN_EMAIL,
  process.env.SEED_NURSE_EMAIL,
  process.env.SEED_RESIDENT_EMAIL,
  process.env.SEED_SPECIALIST_EMAIL,
].filter(Boolean).map((e) => e.toLowerCase());

async function cleanupTestData() {
  const protectedUsers = await prisma.user.findMany({
    where: { email: { in: PROTECTED_EMAILS } },
    select: { id: true },
  });
  const protectedIds = protectedUsers.map((u) => u.id);

  await prisma.auditLog.deleteMany({
    where: { userId: { notIn: protectedIds } },
  });
  await prisma.user.deleteMany({
    where: { email: { notIn: PROTECTED_EMAILS } },
  });
  await prisma.bed.deleteMany({});
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Admin API Endpoints", () => {
  let adminCookie;
  let nurseCookie;

  beforeAll(async () => {
    const adminToken = await generateAdminToken();
    adminCookie = `${COOKIE_NAME}=${adminToken}`;

    const nurseToken = await generateNurseToken();
    nurseCookie = `${COOKIE_NAME}=${nurseToken}`;
  });

  describe("Authentication & Authorization", () => {
    it("should reject access without token", async () => {
      const res = await request(app).get("/admin/users");
      expect(res.statusCode).toBe(401);
    });

    it("should reject access for non-admin users (Nurse)", async () => {
      const res = await request(app).get("/admin/users").set("Cookie", nurseCookie);
      expect(res.statusCode).toBe(403);
    });
  });

  describe("Users Management (/admin/users)", () => {
    describe("POST /admin/users", () => {
      it("should create a new user successfully", async () => {
        const res = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({
            first_name: "John",
            last_name: "Doe",
            email: "johndoe@smartcare.icu",
            role: "nurse"
          });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.data.email).toBe("johndoe@smartcare.icu");
        expect(res.body.data.role).toBe("ICU_NURSE");
      });

      it("should reject missing required fields", async () => {
        const res = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({
            first_name: "John",
            role: "nurse"
          });
        expect(res.statusCode).toBe(400);
      });

      it("should reject invalid role enum", async () => {
        const res = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({
            first_name: "John",
            last_name: "Doe",
            email: "johndoe2@smartcare.icu",
            role: "INVALID_ROLE"
          });
        expect(res.statusCode).toBe(400);
      });

      it("should reject duplicate email", async () => {
        const payload = {
          first_name: "Jane",
          last_name: "Doe",
          email: "duplicate@smartcare.icu",
          role: "specialist"
        };
        await request(app).post("/admin/users").set("Cookie", adminCookie).send(payload);
        
        const res = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send(payload);
        
        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe("Email already exists");
      });
    });

    describe("GET /admin/users", () => {
      it("should list users with pagination", async () => {
        const res = await request(app)
          .get("/admin/users?page=1&limit=10")
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.meta.total).toBeGreaterThan(0);
      });
    });

    describe("GET /admin/users/:id", () => {
      it("should return a single user", async () => {
        const createRes = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({ first_name: "Alice", last_name: "Smith", email: "alice@smartcare.icu", role: "resident" });
        
        const userId = createRes.body.data.id;
        
        const res = await request(app)
          .get(`/admin/users/${userId}`)
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.email).toBe("alice@smartcare.icu");
      });

      it("should return 404 for non-existent user", async () => {
        const res = await request(app)
          .get("/admin/users/12345678-1234-1234-1234-123456789012")
          .set("Cookie", adminCookie);
        expect(res.statusCode).toBe(404);
      });
    });

    describe("PATCH /admin/users/:id", () => {
      it("should update user role", async () => {
        const createRes = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({ first_name: "Bob", last_name: "Marley", email: "bob@smartcare.icu", role: "nurse" });
        
        const userId = createRes.body.data.id;
        
        const res = await request(app)
          .patch(`/admin/users/${userId}`)
          .set("Cookie", adminCookie)
          .send({ role: "specialist" });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.role).toBe("ICU_SPECIALIST");
      });

      it("should update user status", async () => {
        const createRes = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({ first_name: "Charlie", last_name: "Brown", email: "charlie@smartcare.icu", role: "nurse" });
        
        const userId = createRes.body.data.id;
        
        const res = await request(app)
          .patch(`/admin/users/${userId}`)
          .set("Cookie", adminCookie)
          .send({ status: "INACTIVE" });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe("INACTIVE");
      });
    });

    describe("DELETE /admin/users/:id", () => {
      it("should soft delete (archive) a user", async () => {
        const createRes = await request(app)
          .post("/admin/users")
          .set("Cookie", adminCookie)
          .send({ first_name: "David", last_name: "Bowie", email: "david@smartcare.icu", role: "nurse" });
        
        const userId = createRes.body.data.id;
        
        const res = await request(app)
          .delete(`/admin/users/${userId}`)
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(204);
        
        // Verify soft delete worked
        const getRes = await request(app)
          .get(`/admin/users/${userId}`)
          .set("Cookie", adminCookie);
        expect(getRes.body.data.status).toBe("INACTIVE");
      });
    });
  });

  describe("Beds Management (/admin/beds)", () => {
    describe("POST /admin/beds", () => {
      it("should create a bed successfully", async () => {
        const res = await request(app)
          .post("/admin/beds")
          .set("Cookie", adminCookie)
          .send({ bed_number: "BED-001" });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.data.bed_number).toBe("BED-001");
        expect(res.body.data.status).toBe("AVAILABLE");
      });

      it("should reject duplicate bed number", async () => {
        await request(app).post("/admin/beds").set("Cookie", adminCookie).send({ bed_number: "BED-002" });
        const res = await request(app).post("/admin/beds").set("Cookie", adminCookie).send({ bed_number: "BED-002" });
        expect(res.statusCode).toBe(409);
      });

      it("should reject missing bed number", async () => {
        const res = await request(app).post("/admin/beds").set("Cookie", adminCookie).send({});
        expect(res.statusCode).toBe(400);
      });
    });

    describe("GET /admin/beds", () => {
      it("should list beds", async () => {
        await prisma.bed.create({ data: { bedNumber: "BED-003" } });
        const res = await request(app)
          .get("/admin/beds")
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
      });
    });

    describe("PATCH /admin/beds/:id", () => {
      it("should update bed status", async () => {
        const createRes = await request(app)
          .post("/admin/beds")
          .set("Cookie", adminCookie)
          .send({ bed_number: "BED-004" });
        
        const bedId = createRes.body.data.id;
        
        const res = await request(app)
          .patch(`/admin/beds/${bedId}`)
          .set("Cookie", adminCookie)
          .send({ status: "MAINTENANCE" });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe("MAINTENANCE");
      });

      it("should reject invalid bed status", async () => {
        const createRes = await request(app)
          .post("/admin/beds")
          .set("Cookie", adminCookie)
          .send({ bed_number: "BED-005" });
        
        const bedId = createRes.body.data.id;
        
        const res = await request(app)
          .patch(`/admin/beds/${bedId}`)
          .set("Cookie", adminCookie)
          .send({ status: "BROKEN" });
        
        expect(res.statusCode).toBe(400);
      });
    });

    describe("GET /admin/beds/:id", () => {
      it("should get a bed by id", async () => {
        const createRes = await request(app)
          .post("/admin/beds")
          .set("Cookie", adminCookie)
          .send({ bed_number: "BED-GET-TEST" });
        
        const bedId = createRes.body.data.id;
        
        const res = await request(app)
          .get(`/admin/beds/${bedId}`)
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.bed_number).toBe("BED-GET-TEST");
      });

      it("should return 404 for non-existent bed", async () => {
        const res = await request(app)
          .get("/admin/beds/12345678-1234-1234-1234-123456789012")
          .set("Cookie", adminCookie);
        
        expect(res.statusCode).toBe(404);
      });
    });
  });
});
