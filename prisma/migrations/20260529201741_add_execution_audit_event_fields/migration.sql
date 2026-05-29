-- AlterTable
ALTER TABLE "phase_execution_events"
ADD COLUMN "actorType" TEXT,
ADD COLUMN "actorUserId" TEXT,
ADD COLUMN "actorPersonelId" TEXT,
ADD COLUMN "operationStep" TEXT,
ADD COLUMN "fromStatus" TEXT,
ADD COLUMN "toStatus" TEXT,
ADD COLUMN "reasonCode" TEXT,
ADD COLUMN "costType" TEXT,
ADD COLUMN "costAmount" DECIMAL(65,30),
ADD COLUMN "currency" TEXT,
ADD COLUMN "attachmentUrl" TEXT,
ADD COLUMN "attachmentType" TEXT;

-- CreateIndex
CREATE INDEX "phase_execution_events_atolyeId_createdAt_idx" ON "phase_execution_events"("atolyeId", "createdAt");

-- CreateIndex
CREATE INDEX "phase_execution_events_operationStep_idx" ON "phase_execution_events"("operationStep");

-- CreateIndex
CREATE INDEX "phase_execution_events_eventType_idx" ON "phase_execution_events"("eventType");

-- CreateIndex
CREATE INDEX "phase_execution_events_actorPersonelId_idx" ON "phase_execution_events"("actorPersonelId");

-- CreateIndex
CREATE INDEX "phase_execution_events_actorUserId_idx" ON "phase_execution_events"("actorUserId");
