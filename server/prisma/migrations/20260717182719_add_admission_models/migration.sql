-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "admission_reason" TEXT,
    "place_of_transfer" TEXT,
    "transfer_doctor_name" TEXT,
    "chief_complaint" TEXT,
    "symptoms_related_system" TEXT,
    "symptoms_other_systems" TEXT,
    "previous_investigations" TEXT,
    "previous_treatments" TEXT,
    "provisional_diagnosis" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discharged_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_nurses" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_nurses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admissions_patient_id_idx" ON "admissions"("patient_id");

-- CreateIndex
CREATE INDEX "admissions_status_idx" ON "admissions"("status");

-- CreateIndex
CREATE INDEX "admissions_doctor_id_idx" ON "admissions"("doctor_id");

-- CreateIndex
CREATE INDEX "admissions_bed_id_idx" ON "admissions"("bed_id");

-- One ACTIVE admission per bed (partial unique index)
CREATE UNIQUE INDEX "uq_active_bed" ON "admissions"("bed_id") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "admission_nurses_admission_id_idx" ON "admission_nurses"("admission_id");

-- CreateIndex
CREATE INDEX "admission_nurses_nurse_id_idx" ON "admission_nurses"("nurse_id");

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_nurses" ADD CONSTRAINT "admission_nurses_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_nurses" ADD CONSTRAINT "admission_nurses_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
