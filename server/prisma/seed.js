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

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@smartcare.icu").trim();
  const adminPassword = (process.env.SEED_ADMIN_PASSWORD || "SuperSecurePassword2026!").trim();
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

  const nurseEmail = (process.env.SEED_NURSE_EMAIL || "nurse@smartcare.icu").trim();
  const nursePassword = (process.env.SEED_NURSE_PASSWORD || "SuperSecurePassword2026!").trim();
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

  const residentEmail = (process.env.SEED_RESIDENT_EMAIL || "resident@smartcare.icu").trim();
  const residentPassword = (process.env.SEED_RESIDENT_PASSWORD || "SuperSecurePassword2026!").trim();
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

  const specialistEmail = (process.env.SEED_SPECIALIST_EMAIL || "specialist@smartcare.icu").trim();
  const specialistPassword = (process.env.SEED_SPECIALIST_PASSWORD || "SuperSecurePassword2026!").trim();
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

  if (residentEmail && specialistEmail && nurseEmail) {
    const specialistUser = await prisma.user.findUnique({ where: { email: specialistEmail.toLowerCase() } });
    const residentUser = await prisma.user.findUnique({ where: { email: residentEmail.toLowerCase() } });
    const nurseUser = await prisma.user.findUnique({ where: { email: nurseEmail.toLowerCase() } });

    if (specialistUser && residentUser && nurseUser) {
      const seedPatients = [
        { name: "Emma Rodriguez", mrn: "MRN-EMMA-001", age: 52, gender: "Female", bedNumber: "CCU-7/R3" },
        { name: "James Porter", mrn: "MRN-JAMES-002", age: 59, gender: "Male", bedNumber: "CCU-7/B5" },
        { name: "Liu Wei", mrn: "MRN-LIU-003", age: 64, gender: "Male", bedNumber: "CCU-8/B2" },
        { name: "Sofia Martinez", mrn: "MRN-SOFIA-004", age: 41, gender: "Female", bedNumber: "ICU-N/R7" },
        { name: "Derek Thompson", mrn: "MRN-DEREK-005", age: 48, gender: "Male", bedNumber: "ICU-S/R4" },
        { name: "Fatima Al-Hassan", mrn: "MRN-FATIMA-006", age: 37, gender: "Female", bedNumber: "ICU-S/R1" },
      ];

      for (const p of seedPatients) {
        const patient = await prisma.patient.upsert({
          where: { mrn: p.mrn },
          update: { name: p.name, age: p.age, gender: p.gender },
          create: { mrn: p.mrn, name: p.name, age: p.age, gender: p.gender },
        });

        const bed = await prisma.bed.upsert({
          where: { bedNumber: p.bedNumber },
          update: { status: "OCCUPIED" },
          create: { bedNumber: p.bedNumber, status: "OCCUPIED" },
        });

        let admission = await prisma.admission.findFirst({
          where: { patientId: patient.id, status: "ACTIVE" },
        });

        if (!admission) {
          admission = await prisma.admission.create({
            data: {
              patientId: patient.id,
              bedId: bed.id,
              doctorId: specialistUser.id,
              status: "ACTIVE",
            },
          });
        } else {
          admission = await prisma.admission.update({
            where: { id: admission.id },
            data: { bedId: bed.id, doctorId: specialistUser.id },
          });
        }
        console.log(`Seeded patient ${p.name} on bed ${p.bedNumber} (Admission: ${admission.id})`);

        if (p.mrn === "MRN-JAMES-002") {
          const vitalsCount = await prisma.vitalSign.count({
            where: { admissionId: admission.id },
          });

          if (vitalsCount === 0) {
            const now = new Date();
            const historicalVitals = [
              { hoursAgo: 24, temp: 37.5, pulse: 80, sBp: 120, dBp: 80, rr: 18, spo2: 98 },
              { hoursAgo: 22, temp: 37.8, pulse: 85, sBp: 118, dBp: 78, rr: 19, spo2: 97 },
              { hoursAgo: 20, temp: 38.1, pulse: 90, sBp: 115, dBp: 75, rr: 20, spo2: 96 },
              { hoursAgo: 18, temp: 38.4, pulse: 95, sBp: 110, dBp: 70, rr: 22, spo2: 95 },
              { hoursAgo: 16, temp: 38.8, pulse: 100, sBp: 105, dBp: 65, rr: 24, spo2: 94 },
              { hoursAgo: 14, temp: 39.1, pulse: 105, sBp: 100, dBp: 60, rr: 25, spo2: 93 },
              { hoursAgo: 12, temp: 39.3, pulse: 110, sBp: 95, dBp: 58, rr: 26, spo2: 92 },
              { hoursAgo: 10, temp: 39.5, pulse: 112, sBp: 92, dBp: 55, rr: 27, spo2: 91 },
              { hoursAgo: 8, temp: 39.6, pulse: 115, sBp: 90, dBp: 54, rr: 28, spo2: 91 },
              { hoursAgo: 6, temp: 39.7, pulse: 116, sBp: 89, dBp: 53, rr: 28, spo2: 91 },
              { hoursAgo: 4, temp: 39.8, pulse: 118, sBp: 88, dBp: 52, rr: 28, spo2: 91 },
              { hoursAgo: 2, temp: 39.8, pulse: 118, sBp: 88, dBp: 52, rr: 28, spo2: 91 },
              { hoursAgo: 0, temp: 39.8, pulse: 118, sBp: 88, dBp: 52, rr: 28, spo2: 91 },
            ];

            for (const v of historicalVitals) {
              const recordedAt = new Date(now.getTime() - v.hoursAgo * 60 * 60 * 1000);
              await prisma.vitalSign.create({
                data: {
                  admissionId: admission.id,
                  recordedById: residentUser.id,
                  temperature: v.temp,
                  pulse: v.pulse,
                  systolicBp: v.sBp,
                  diastolicBp: v.dBp,
                  respiratoryRate: v.rr,
                  spo2: v.spo2,
                  recordedAt,
                },
              });
            }
            console.log("Seeded vital sign history for James Porter");
          }
        }

        // Seed medications for the patient
        const medsCount = await prisma.medication.count({ where: { admissionId: admission.id } });
        if (medsCount === 0) {
          const medicationsToPrescribe = [
            { drugName: "Heparin", dosage: "25,000 u/250mL", frequency: "Continuous" },
            { drugName: "Nitroglycerin", dosage: "0.4 mcg/kg/min", frequency: "Continuous" },
            { drugName: "Normal Saline", dosage: "125 mL/hr", frequency: "Continuous" },
            { drugName: "Aspirin", dosage: "325 mg", frequency: "Daily" },
            { drugName: "Metoprolol", dosage: "25 mg", frequency: "BID" },
            { drugName: "Atorvastatin", dosage: "80 mg", frequency: "QHS" },
            { drugName: "Lisinopril", dosage: "5 mg", frequency: "Daily" },
            { drugName: "Morphine", dosage: "2 mg", frequency: "PRN q4h" }
          ];

          for (const med of medicationsToPrescribe) {
            const createdMed = await prisma.medication.create({
              data: {
                admissionId: admission.id,
                prescribedById: specialistUser.id,
                drugName: med.drugName,
                dosage: med.dosage,
                frequency: med.frequency,
                isActive: true
              }
            });

            // Seed historical administrations for this medication
            const now = new Date();
            if (med.drugName === "Aspirin") {
              await prisma.medicationAdministration.create({
                data: {
                  medicationId: createdMed.id,
                  administeredById: nurseUser.id,
                  status: "ADMINISTERED",
                  administeredDose: "325 mg",
                  scheduledTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  administeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  notes: "Administered at bedside"
                }
              });
            } else if (med.drugName === "Atorvastatin") {
              await prisma.medicationAdministration.create({
                data: {
                  medicationId: createdMed.id,
                  administeredById: nurseUser.id,
                  status: "ADMINISTERED",
                  administeredDose: "80 mg",
                  scheduledTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  administeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  notes: "Administered at bedside"
                }
              });
            } else if (med.drugName === "Normal Saline") {
              await prisma.medicationAdministration.create({
                data: {
                  medicationId: createdMed.id,
                  administeredById: nurseUser.id,
                  status: "REFUSED",
                  scheduledTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  administeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  notes: "Patient refused IV fluids"
                }
              });
            } else if (med.drugName === "Metoprolol") {
              await prisma.medicationAdministration.create({
                data: {
                  medicationId: createdMed.id,
                  administeredById: nurseUser.id,
                  status: "HELD",
                  scheduledTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  administeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                  notes: "Held: SBP < 100"
                }
              });
            }
          }
          console.log(`Seeded medication orders & history for patient ${p.name}`);
        }
      }
    }
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