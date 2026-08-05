-- CreateEnum
CREATE TYPE "TreatmentExecutionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "treatment_approvals" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by" TEXT,
ADD COLUMN     "execution_notes" TEXT,
ADD COLUMN     "execution_status" "TreatmentExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "started_by" TEXT;

-- CreateIndex
CREATE INDEX "treatment_approvals_execution_status_idx" ON "treatment_approvals"("execution_status");

-- AddForeignKey
ALTER TABLE "treatment_approvals" ADD CONSTRAINT "treatment_approvals_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_approvals" ADD CONSTRAINT "treatment_approvals_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
