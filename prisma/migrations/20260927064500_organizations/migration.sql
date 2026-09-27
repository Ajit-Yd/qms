-- Multi-tenancy: add Organization, scope Profile and Committee to it.
-- Staged add -> backfill -> NOT NULL because the tables already hold rows.

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

ALTER TABLE "Profile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "systemRole" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "Committee" ADD COLUMN "organizationId" TEXT;

-- Existing data becomes one organization; rename it freely from the admin screen.
INSERT INTO "Organization" ("id", "name", "active", "createdAt")
VALUES ('org_main', 'Main Organization', true, CURRENT_TIMESTAMP);

UPDATE "Profile" SET "organizationId" = 'org_main';
UPDATE "Committee" SET "organizationId" = 'org_main';

-- The single hierarchy root becomes the global Primary Admin.
UPDATE "Profile" SET "systemRole" = 'primary_admin'
WHERE "reportsTo" IS NULL
  AND "id" = (SELECT "id" FROM "Profile" WHERE "reportsTo" IS NULL ORDER BY "createdAt" ASC, "id" ASC LIMIT 1);

-- Anyone already trusted with committees becomes that org's Secondary Admin.
UPDATE "Profile" SET "systemRole" = 'org_admin'
WHERE "canManageCommittees" = true AND "systemRole" = 'member';

ALTER TABLE "Profile" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Committee" ALTER COLUMN "organizationId" SET NOT NULL;

-- Email is now unique per organization, not globally.
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_email_key";
CREATE UNIQUE INDEX "Profile_organizationId_email_key" ON "Profile"("organizationId", "email");

CREATE INDEX "Profile_organizationId_idx" ON "Profile"("organizationId");
CREATE INDEX "Committee_organizationId_idx" ON "Committee"("organizationId");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Committee" ADD CONSTRAINT "Committee_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
