-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_status_resolvedAt_idx" ON "PasswordResetRequest"("status", "resolvedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_createdAt_idx" ON "PasswordResetRequest"("createdAt");
