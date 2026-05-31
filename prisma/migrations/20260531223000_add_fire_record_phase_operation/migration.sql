-- Link new fire records to production operations without touching legacy rows.
ALTER TABLE "fire_records" ADD COLUMN "phaseOperationId" TEXT;

CREATE INDEX "fire_records_phaseOperationId_idx" ON "fire_records"("phaseOperationId");

ALTER TABLE "fire_records"
  ADD CONSTRAINT "fire_records_phaseOperationId_fkey"
  FOREIGN KEY ("phaseOperationId")
  REFERENCES "schedule_phase_operations"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
