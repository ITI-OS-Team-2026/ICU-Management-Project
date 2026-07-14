const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../src/utils/prismaClient");
const bcrypt = require("bcrypt");

// Shared helper to seed a user. Uses upsert to be idempotent.
// Does not overwrite password hash on update.
async function seedUser({ email, password, firstName, lastName, role }) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      firstName,
      lastName,
      role,
      status: "ACTIVE",
    },
    create: {
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      role,
      status: "ACTIVE",
    },
  });

  return user;
}

async function main() {
  console.log("Starting database seeding...");

  // 1. Seed System Admin (bootstrap requirement — fails script if missing)
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME || "System";
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME || "Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Missing required environment variables: SEED_ADMIN_EMAIL and/or SEED_ADMIN_PASSWORD must be defined."
    );
  }

  const admin = await seedUser({
    email: adminEmail,
    password: adminPassword,
    firstName: adminFirstName,
    lastName: adminLastName,
    role: "SYSTEM_ADMIN",
  });
  console.log(`System Admin successfully seeded/updated (ID: ${admin.id})`);

  // 2. Seed ICU Nurse (development / testing convenience)
  const nurseEmail = process.env.SEED_NURSE_EMAIL;
  const nursePassword = process.env.SEED_NURSE_PASSWORD;
  const nurseFirstName = process.env.SEED_NURSE_FIRST_NAME || "Test";
  const nurseLastName = process.env.SEED_NURSE_LAST_NAME || "Nurse";

  if (nurseEmail && nursePassword) {
    const nurse = await seedUser({
      email: nurseEmail,
      password: nursePassword,
      firstName: nurseFirstName,
      lastName: nurseLastName,
      role: "ICU_NURSE",
    });
    console.log(`ICU Nurse successfully seeded/updated (ID: ${nurse.id})`);
  } else {
    console.warn("Skipping ICU Nurse seed — SEED_NURSE_EMAIL/PASSWORD not set");
  }

  // 3. Seed Medical Resident (development / testing convenience)
  const residentEmail = process.env.SEED_RESIDENT_EMAIL;
  const residentPassword = process.env.SEED_RESIDENT_PASSWORD;
  const residentFirstName = process.env.SEED_RESIDENT_FIRST_NAME || "Test";
  const residentLastName = process.env.SEED_RESIDENT_LAST_NAME || "Resident";

  if (residentEmail && residentPassword) {
    const resident = await seedUser({
      email: residentEmail,
      password: residentPassword,
      firstName: residentFirstName,
      lastName: residentLastName,
      role: "MEDICAL_RESIDENT",
    });
    console.log(`Medical Resident successfully seeded/updated (ID: ${resident.id})`);
  } else {
    console.warn("Skipping Medical Resident seed — SEED_RESIDENT_EMAIL/PASSWORD not set");
  }

  // 4. Seed ICU Specialist (development / testing convenience)
  const specialistEmail = process.env.SEED_SPECIALIST_EMAIL;
  const specialistPassword = process.env.SEED_SPECIALIST_PASSWORD;
  const specialistFirstName = process.env.SEED_SPECIALIST_FIRST_NAME || "Test";
  const specialistLastName = process.env.SEED_SPECIALIST_LAST_NAME || "Specialist";

  if (specialistEmail && specialistPassword) {
    const specialist = await seedUser({
      email: specialistEmail,
      password: specialistPassword,
      firstName: specialistFirstName,
      lastName: specialistLastName,
      role: "ICU_SPECIALIST",
    });
    console.log(`ICU Specialist successfully seeded/updated (ID: ${specialist.id})`);
  } else {
    console.warn("Skipping ICU Specialist seed — SEED_SPECIALIST_EMAIL/PASSWORD not set");
  }

  console.log("Database seeding completed.");
}

main()
  .catch((error) => {
    console.error("Seed execution failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
