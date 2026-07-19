-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "test_name" VARCHAR(255) NOT NULL,
    "result_value" TEXT NOT NULL,
    "abnormal" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_results_admission_id_idx" ON "lab_results"("admission_id");

-- CreateIndex
CREATE INDEX "lab_results_recorded_by_idx" ON "lab_results"("recorded_by");

-- CreateIndex
CREATE INDEX "lab_results_recorded_at_idx" ON "lab_results"("recorded_at");

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
