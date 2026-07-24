const prisma = require('./src/utils/prismaClient');
async function main() {
  await prisma.admission.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.bed.updateMany({ data: { status: 'AVAILABLE' }});
  console.log("DB Reset complete. All beds are now AVAILABLE. All admissions and patients deleted.");
}
main().finally(() => prisma.$disconnect());
