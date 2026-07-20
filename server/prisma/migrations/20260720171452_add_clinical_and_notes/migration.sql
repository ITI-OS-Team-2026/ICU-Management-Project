-- CreateTable
CREATE TABLE "clinical_examinations" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "examiner_id" TEXT NOT NULL,
    "general_exam" JSONB NOT NULL,
    "local_exam" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_examinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_notes" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_examinations_admission_id_idx" ON "clinical_examinations"("admission_id");

-- CreateIndex
CREATE INDEX "clinical_examinations_examiner_id_idx" ON "clinical_examinations"("examiner_id");

-- CreateIndex
CREATE INDEX "clinical_notes_admission_id_idx" ON "clinical_notes"("admission_id");

-- CreateIndex
CREATE INDEX "clinical_notes_author_id_idx" ON "clinical_notes"("author_id");

-- CreateIndex
CREATE INDEX "nursing_notes_admission_id_idx" ON "nursing_notes"("admission_id");

-- CreateIndex
CREATE INDEX "nursing_notes_author_id_idx" ON "nursing_notes"("author_id");

-- AddForeignKey
ALTER TABLE "clinical_examinations" ADD CONSTRAINT "clinical_examinations_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_examinations" ADD CONSTRAINT "clinical_examinations_examiner_id_fkey" FOREIGN KEY ("examiner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
