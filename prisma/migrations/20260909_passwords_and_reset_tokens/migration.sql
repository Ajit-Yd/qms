-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_profileId_idx" ON "PasswordResetToken"("profileId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
  DROP CONSTRAINT IF EXISTS "PasswordResetToken_profileId_fkey";

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Document_deletedAt_idx" ON "Document"("deletedAt");
