-- CreateEnum
CREATE TYPE "PhaseExecutionStatus" AS ENUM (
    'PLANNED',
    'STARTED',
    'PAUSED',
    'CANNOT_START',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULE_REQUESTED'
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "userId" TEXT,
    "personelId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_executions" (
    "id" TEXT NOT NULL,
    "schedulePhaseId" TEXT NOT NULL,
    "personelId" TEXT,
    "atolyeId" TEXT NOT NULL,
    "status" "PhaseExecutionStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartedAt" TIMESTAMP(3),
    "actualEndedAt" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "pauseMinutes" INTEGER,
    "mtul" DECIMAL(65,30),
    "machineId" TEXT,
    "notes" TEXT,
    "cannotStartReason" TEXT,
    "failureDescription" TEXT,
    "materialLossCost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_execution_events" (
    "id" TEXT NOT NULL,
    "phaseExecutionId" TEXT NOT NULL,
    "schedulePhaseId" TEXT NOT NULL,
    "personelId" TEXT,
    "atolyeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phase_execution_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_atolyeId_idx" ON "ActivityLog"("atolyeId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "phase_executions_schedulePhaseId_idx" ON "phase_executions"("schedulePhaseId");

-- CreateIndex
CREATE INDEX "phase_executions_atolyeId_idx" ON "phase_executions"("atolyeId");

-- CreateIndex
CREATE INDEX "phase_executions_personelId_idx" ON "phase_executions"("personelId");

-- CreateIndex
CREATE INDEX "phase_execution_events_phaseExecutionId_idx" ON "phase_execution_events"("phaseExecutionId");

-- CreateIndex
CREATE INDEX "phase_execution_events_schedulePhaseId_idx" ON "phase_execution_events"("schedulePhaseId");

-- CreateIndex
CREATE INDEX "phase_execution_events_atolyeId_idx" ON "phase_execution_events"("atolyeId");

-- AddForeignKey
ALTER TABLE "phase_executions" ADD CONSTRAINT "phase_executions_schedulePhaseId_fkey" FOREIGN KEY ("schedulePhaseId") REFERENCES "schedule_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_executions" ADD CONSTRAINT "phase_executions_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_execution_events" ADD CONSTRAINT "phase_execution_events_phaseExecutionId_fkey" FOREIGN KEY ("phaseExecutionId") REFERENCES "phase_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
