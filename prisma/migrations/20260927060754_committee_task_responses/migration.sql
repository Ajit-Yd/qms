-- AlterTable
ALTER TABLE "CommitteeTask" ADD COLUMN     "fileData" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "responseNote" TEXT;

-- CreateIndex
CREATE INDEX "CommitteeTask_status_idx" ON "CommitteeTask"("status");
