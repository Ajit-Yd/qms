-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "Capa" ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "Nonconformance" ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "assignedBy" TEXT;

-- CreateIndex
CREATE INDEX "Audit_assignedBy_idx" ON "Audit"("assignedBy");

-- CreateIndex
CREATE INDEX "Capa_assignedBy_idx" ON "Capa"("assignedBy");

-- CreateIndex
CREATE INDEX "Document_assignedBy_idx" ON "Document"("assignedBy");

-- CreateIndex
CREATE INDEX "Nonconformance_assignedBy_idx" ON "Nonconformance"("assignedBy");

-- CreateIndex
CREATE INDEX "Training_assignedBy_idx" ON "Training"("assignedBy");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capa" ADD CONSTRAINT "Capa_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nonconformance" ADD CONSTRAINT "Nonconformance_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
