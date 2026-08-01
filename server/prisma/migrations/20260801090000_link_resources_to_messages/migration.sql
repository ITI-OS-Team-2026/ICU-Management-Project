-- Bind a chat resource to the message it was sent with, so the transcript can
-- render it inline. Null while the file is still staged in the composer.

-- AlterTable
ALTER TABLE "medical_documents" ADD COLUMN "message_id" TEXT;

-- CreateIndex
CREATE INDEX "medical_documents_message_id_idx" ON "medical_documents"("message_id");

-- AddForeignKey
-- SET NULL rather than CASCADE: deleting the chat already removes the file via
-- chat_session_id, and a lone message delete must not destroy a stored upload.
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
