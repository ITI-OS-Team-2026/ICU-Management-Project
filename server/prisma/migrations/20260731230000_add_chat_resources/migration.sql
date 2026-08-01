-- Assistant chat resources: files a clinician attaches to a Medical Knowledge
-- Assistant chat. They reuse medical_documents (and therefore the whole extract →
-- chunk → embed pipeline), but belong to a chat instead of an admission.

-- AlterTable — a document now belongs to EITHER an admission OR a chat.
ALTER TABLE "medical_documents" ALTER COLUMN "admission_id" DROP NOT NULL;
ALTER TABLE "medical_documents" ADD COLUMN "chat_session_id" TEXT;

-- AlterTable — chunk rows mirror their document's (now optional) admission.
ALTER TABLE "document_embeddings" ALTER COLUMN "admission_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "medical_documents_chat_session_id_idx" ON "medical_documents"("chat_session_id");

-- AddForeignKey — deleting a chat removes its attachments, and their chunks in turn.
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
