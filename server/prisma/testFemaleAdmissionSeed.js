const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../src/utils/prismaClient");
const { v4: uuidv4 } = require("uuid");

async function main() {
  console.log("Starting female patient test seed...");

  // Generate a random MRN
  const mrn = `MRN-${Math.floor(Math.random() * 10000)}`;

  // Find a bed that's empty
  const emptyBed = await prisma.bed.findFirst({
    where: { status: "AVAILABLE" }
  });

  if (!emptyBed) {
    console.error("No available beds found. Please free a bed first.");
    return;
  }

  // Find a doctor
  const doctor = await prisma.user.findFirst({
    where: { role: "ICU_SPECIALIST" }
  });

  if (!doctor) {
    console.error("No doctor found.");
    return;
  }

  // 1. Create Patient
  const patient = await prisma.patient.create({
    data: {
      mrn,
      name: "Jane Doe (Test Female)",
      age: 28,
      gender: "FEMALE",
      maritalStatus: "MARRIED",
      childrenCount: 2,
      youngestChildAge: "3",
      residence: "Cairo, Egypt",
      occupation: "Software Engineer",
      handedness: "RIGHT",
      medicalHistory: {
        create: {
          diabetesDm: false,
          hypertensionHtn: false,
          bloodTransfusion: true,
          specialHabits: "Drinks coffee",
          menstrualHistory: {
            menarche: "13",
            cycle_rhythm: "REGULAR",
            cycle_length: "28",
            duration_of_flow: "5",
            character_of_flow: "Normal amount",
            dysmenorrhea: true,
            dysmenorrhea_details: "Mild pain on first day",
            lnmp: "2026-07-01",
          },
          obstetricHistory: {
            gravidity: "2",
            parity: "2",
            full_term_normal_deliveries: "2",
            cesarean_section: false,
            abortions: false,
            last_delivery_date: "2023-05-10",
          }
        }
      }
    }
  });

  console.log(`Created Patient: ${patient.name} (MRN: ${patient.mrn})`);

  // 2. Create Admission
  const admission = await prisma.admission.create({
    data: {
      patientId: patient.id,
      bedId: emptyBed.id,
      doctorId: doctor.id,
      status: "ACTIVE",
      chiefComplaint: "Shortness of breath",
      complaintAnalysis: "Sudden onset since morning",
      provisionalDiagnosis: "Asthma Exacerbation",
      symptomsRelatedSystem: "Wheezing, cough",
    }
  });

  // 3. Mark bed as occupied
  await prisma.bed.update({
    where: { id: emptyBed.id },
    data: { status: "OCCUPIED" }
  });

  console.log(`Created Admission for ${patient.name} in Bed ${emptyBed.bedNumber}`);
  console.log("Seed successful.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
