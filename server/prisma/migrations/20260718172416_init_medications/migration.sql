-- CreateEnum
CREATE TYPE "AdministrationStatus" AS ENUM ('ADMINISTERED', 'REFUSED', 'HELD', 'MISSED');

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "prescribed_by" TEXT NOT NULL,
    "drug_name" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(100) NOT NULL,
    "frequency" VARCHAR(100) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "prescribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "administered_by" TEXT NOT NULL,
    "administered_dose" VARCHAR(100),
    "status" "AdministrationStatus" NOT NULL,
    "notes" TEXT,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "administered_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medications_admission_id_idx" ON "medications"("admission_id");

-- CreateIndex
CREATE INDEX "medications_is_active_idx" ON "medications"("is_active");

-- CreateIndex
CREATE INDEX "medication_administrations_medication_id_idx" ON "medication_administrations"("medication_id");

-- CreateIndex
CREATE INDEX "medication_administrations_administered_by_idx" ON "medication_administrations"("administered_by");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_fkey" FOREIGN KEY ("administered_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
