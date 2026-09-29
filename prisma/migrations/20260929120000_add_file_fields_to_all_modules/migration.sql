-- Attachments for every record module, not just documents.
-- Mirrors the columns added to Document by 20260921162639_add_document_file_fields.
-- All columns nullable so existing rows need no backfill.

ALTER TABLE "Capa" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Capa" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Capa" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Capa" ADD COLUMN "fileData" TEXT;

ALTER TABLE "Nonconformance" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Nonconformance" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Nonconformance" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Nonconformance" ADD COLUMN "fileData" TEXT;

ALTER TABLE "Audit" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Audit" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Audit" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Audit" ADD COLUMN "fileData" TEXT;

ALTER TABLE "Training" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Training" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Training" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Training" ADD COLUMN "fileData" TEXT;