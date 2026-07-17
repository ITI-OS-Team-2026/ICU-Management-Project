-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');

-- CreateEnum
CREATE TYPE "Handedness" AS ENUM ('RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNKNOWN');

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "mrn" VARCHAR(50) NOT NULL,
    "national_id" VARCHAR(50),
    "name" VARCHAR(200) NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" VARCHAR(30),
    "residence" TEXT,
    "occupation" TEXT,
    "marital_status" "MaritalStatus",
    "handedness" "Handedness",
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "diabetes_dm" BOOLEAN NOT NULL DEFAULT false,
    "hypertension_htn" BOOLEAN NOT NULL DEFAULT false,
    "past_similar_conditions" TEXT,
    "past_diseases" JSONB,
    "previous_operations" BOOLEAN NOT NULL DEFAULT false,
    "operations_details" TEXT,
    "has_allergies" BOOLEAN NOT NULL DEFAULT false,
    "traveled_abroad" BOOLEAN NOT NULL DEFAULT false,
    "consanguinity" BOOLEAN NOT NULL DEFAULT false,
    "family_similar_conditions" TEXT,
    "inherited_diseases" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "allergen" VARCHAR(200) NOT NULL,
    "severity" VARCHAR(50),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_patient_id_key" ON "medical_histories"("patient_id");

-- CreateIndex
CREATE INDEX "allergies_patient_id_idx" ON "allergies"("patient_id");

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
