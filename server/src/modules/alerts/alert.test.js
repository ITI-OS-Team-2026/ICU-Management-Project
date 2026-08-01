const prisma = require('../../utils/prismaClient');
const { runMonitoringCycle } = require('./monitoring.job');

async function testAlertsSystem() {
  console.log("=== Testing the Automated Alert System ===\n");

  try {
    // 1. Find an active admission to test with
    const admission = await prisma.admission.findFirst({
      where: { status: 'ACTIVE' },
      include: { patient: true }
    });

    const dummyUser = await prisma.user.findFirst();

    if (!admission || !dummyUser) {
      console.log("❌ No active admissions or users found in the database. Please add them first.");
      process.exit(1);
    }

    console.log(`✅ Found active admission for Patient: ${admission.patient.firstName} ${admission.patient.lastName} (ID: ${admission.id})`);

    // 2. Insert highly abnormal vitals for this patient
    console.log("💉 Inserting abnormal vital signs (Pulse: 135, Resp Rate: 26, SpO2: 89%)...");
    const vitals = await prisma.vitalSign.create({
      data: {
        admissionId: admission.id,
        recordedAt: new Date(),
        pulse: 135,         // Score 3 (High)
        respiratoryRate: 26,    // Score 3 (High)
        spo2: 89,   // Score 3 (Low)
        systolicBp: 120,        // Score 0
        diastolicBp: 80,
        temperature: 38.0,      // Score 1
        recordedById: dummyUser.id // Dummy recorder for test
      }
    });
    console.log("✅ Abnormal vitals saved successfully.\n");

    // 3. Trigger the exact function that the Cron Job runs
    console.log("🤖 Simulating Cron Job execution (Calculating NEWS2 score)...");
    await runMonitoringCycle();

    console.log("\n=== Test Completed Successfully ===");
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAlertsSystem();
