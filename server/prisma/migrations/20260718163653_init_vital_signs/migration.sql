-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "temperature" DECIMAL(4,1),
    "pulse" INTEGER,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "respiratory_rate" INTEGER,
    "spo2" INTEGER,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_signs_admission_id_idx" ON "vital_signs"("admission_id");

-- CreateIndex
CREATE INDEX "vital_signs_recorded_at_idx" ON "vital_signs"("recorded_at");

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
