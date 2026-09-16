-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Document_deletedAt_idx" ON "Document"("deletedAt");