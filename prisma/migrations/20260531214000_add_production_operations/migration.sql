-- CreateEnum
CREATE TYPE "ProductionOperationType" AS ENUM ('KESIM', 'TOPLAMA');

-- CreateEnum
CREATE TYPE "ProductionOperationStatus" AS ENUM ('PLANNED', 'READY', 'STARTED', 'PAUSED', 'CANNOT_START', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "schedule_phase_operations" (
    "id" TEXT NOT NULL,
    "schedulePhaseId" TEXT NOT NULL,
    "operationType" "ProductionOperationType" NOT NULL,
    "status" "ProductionOperationStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_phase_operations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "phase_executions" ADD COLUMN "phaseOperationId" TEXT;

-- AlterTable
ALTER TABLE "phase_execution_events" ADD COLUMN "phaseOperationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "schedule_phase_operations_schedulePhaseId_operationType_key" ON "schedule_phase_operations"("schedulePhaseId", "operationType");

-- CreateIndex
CREATE INDEX "schedule_phase_operations_schedulePhaseId_idx" ON "schedule_phase_operations"("schedulePhaseId");

-- CreateIndex
CREATE INDEX "schedule_phase_operations_operationType_idx" ON "schedule_phase_operations"("operationType");

-- CreateIndex
CREATE INDEX "schedule_phase_operations_status_idx" ON "schedule_phase_operations"("status");

-- CreateIndex
CREATE INDEX "phase_executions_phaseOperationId_idx" ON "phase_executions"("phaseOperationId");

-- CreateIndex
CREATE INDEX "phase_execution_events_phaseOperationId_idx" ON "phase_execution_events"("phaseOperationId");

-- AddForeignKey
ALTER TABLE "schedule_phase_operations" ADD CONSTRAINT "schedule_phase_operations_schedulePhaseId_fkey" FOREIGN KEY ("schedulePhaseId") REFERENCES "schedule_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_executions" ADD CONSTRAINT "phase_executions_phaseOperationId_fkey" FOREIGN KEY ("phaseOperationId") REFERENCES "schedule_phase_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_execution_events" ADD CONSTRAINT "phase_execution_events_phaseOperationId_fkey" FOREIGN KEY ("phaseOperationId") REFERENCES "schedule_phase_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
