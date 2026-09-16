/*
  Warnings:

  - You are about to drop the column `recordUrl` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `relatedId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `relatedType` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "recordUrl",
DROP COLUMN "relatedId",
DROP COLUMN "relatedType",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "link" TEXT;

-- CreateTable
CREATE TABLE "RecordHistory" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordHistory_recordType_recordId_idx" ON "RecordHistory"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "RecordHistory_changedBy_idx" ON "RecordHistory"("changedBy");

-- CreateIndex
CREATE INDEX "Comment_recordType_recordId_idx" ON "Comment"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
