/*
  Warnings:

  - You are about to drop the column `general_exam` on the `clinical_examinations` table. All the data in the column will be lost.
  - You are about to drop the column `local_exam` on the `clinical_examinations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'ALERT', 'SUMMON');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- AlterTable
ALTER TABLE "clinical_examinations" DROP COLUMN "general_exam",
DROP COLUMN "local_exam",
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "general_exams" JSONB,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "local_exams" JSONB;

-- AlterTable
ALTER TABLE "medical_histories" ADD COLUMN     "blood_transfusion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menstrual_history" JSONB,
ADD COLUMN     "obstetric_history" JSONB,
ADD COLUMN     "special_habits" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "children_count" INTEGER,
ADD COLUMN     "youngest_child_age" VARCHAR(50);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
