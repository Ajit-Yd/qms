-- AlterTable
ALTER TABLE "Capa" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Capa" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Nonconformance" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Capa_deletedAt_idx" ON "Capa"("deletedAt");
CREATE INDEX IF NOT EXISTS "Nonconformance_deletedAt_idx" ON "Nonconformance"("deletedAt");
CREATE INDEX IF NOT EXISTS "Audit_deletedAt_idx" ON "Audit"("deletedAt");
CREATE INDEX IF NOT EXISTS "Training_deletedAt_idx" ON "Training"("deletedAt");
