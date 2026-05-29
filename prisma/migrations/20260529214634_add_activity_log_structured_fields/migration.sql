ALTER TABLE "ActivityLog"
  ADD COLUMN "eventType" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "severity" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "url" TEXT,
  ADD COLUMN "refType" TEXT,
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "actorName" TEXT,
  ADD COLUMN "attachmentUrl" TEXT,
  ADD COLUMN "metadata" JSONB;
