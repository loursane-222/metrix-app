-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('OLCU', 'IMALAT', 'MONTAJ');

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_phases" (
    "id" TEXT NOT NULL,
    "workScheduleId" TEXT NOT NULL,
    "phase" "PhaseType" NOT NULL,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_phases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_isId_key" ON "work_schedules"("isId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_phases_workScheduleId_phase_key" ON "schedule_phases"("workScheduleId", "phase");

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_isId_fkey" FOREIGN KEY ("isId") REFERENCES "Is"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_phases" ADD CONSTRAINT "schedule_phases_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
