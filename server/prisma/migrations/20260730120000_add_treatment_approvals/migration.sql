-- CreateTable
CREATE TABLE "treatment_approvals" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "treatment_name" VARCHAR(255) NOT NULL,
    "clinical_justification" TEXT,
    "approval_status" BOOLEAN,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatment_approvals_admission_id_idx" ON "treatment_approvals"("admission_id");

-- CreateIndex
CREATE INDEX "treatment_approvals_requested_by_idx" ON "treatment_approvals"("requested_by");

-- CreateIndex
CREATE INDEX "treatment_approvals_approved_by_idx" ON "treatment_approvals"("approved_by");

-- CreateIndex
CREATE INDEX "treatment_approvals_approval_status_idx" ON "treatment_approvals"("approval_status");

-- AddForeignKey
ALTER TABLE "treatment_approvals" ADD CONSTRAINT "treatment_approvals_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_approvals" ADD CONSTRAINT "treatment_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_approvals" ADD CONSTRAINT "treatment_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
