-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "roleTitle" TEXT NOT NULL,
    "reportsTo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canManageCommittees" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capa" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Capa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nonconformance" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nonconformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "assignedTo" TEXT NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMembership" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "roleInCommittee" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitteeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeTask" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitteeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "recordUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_reportsTo_idx" ON "Profile"("reportsTo");

-- CreateIndex
CREATE INDEX "Document_assignedTo_idx" ON "Document"("assignedTo");

-- CreateIndex
CREATE INDEX "Capa_assignedTo_idx" ON "Capa"("assignedTo");

-- CreateIndex
CREATE INDEX "Nonconformance_assignedTo_idx" ON "Nonconformance"("assignedTo");

-- CreateIndex
CREATE INDEX "Audit_assignedTo_idx" ON "Audit"("assignedTo");

-- CreateIndex
CREATE INDEX "Training_assignedTo_idx" ON "Training"("assignedTo");

-- CreateIndex
CREATE INDEX "Committee_createdBy_idx" ON "Committee"("createdBy");

-- CreateIndex
CREATE INDEX "CommitteeMembership_committeeId_idx" ON "CommitteeMembership"("committeeId");

-- CreateIndex
CREATE INDEX "CommitteeMembership_profileId_idx" ON "CommitteeMembership"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeMembership_committeeId_profileId_key" ON "CommitteeMembership"("committeeId", "profileId");

-- CreateIndex
CREATE INDEX "CommitteeTask_committeeId_idx" ON "CommitteeTask"("committeeId");

-- CreateIndex
CREATE INDEX "CommitteeTask_assignedTo_idx" ON "CommitteeTask"("assignedTo");

-- CreateIndex
CREATE INDEX "CommitteeTask_assignedBy_idx" ON "CommitteeTask"("assignedBy");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_reportsTo_fkey" FOREIGN KEY ("reportsTo") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capa" ADD CONSTRAINT "Capa_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nonconformance" ADD CONSTRAINT "Nonconformance_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeTask" ADD CONSTRAINT "CommitteeTask_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeTask" ADD CONSTRAINT "CommitteeTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeTask" ADD CONSTRAINT "CommitteeTask_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
