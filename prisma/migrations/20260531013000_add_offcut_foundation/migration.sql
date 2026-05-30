ALTER TABLE "stock_offcuts"
  ADD COLUMN IF NOT EXISTS "parentOffcutId" TEXT,
  ADD COLUMN IF NOT EXISTS "costPerM2" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scrappedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "stock_offcuts_atolyeId_parentOffcutId_idx"
  ON "stock_offcuts"("atolyeId", "parentOffcutId");

ALTER TABLE "stock_offcuts"
  ADD CONSTRAINT "stock_offcuts_parentPlateId_fkey"
  FOREIGN KEY ("parentPlateId") REFERENCES "stock_plates"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "stock_offcuts"
  ADD CONSTRAINT "stock_offcuts_parentOffcutId_fkey"
  FOREIGN KEY ("parentOffcutId") REFERENCES "stock_offcuts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_stockPlateId_fkey"
  FOREIGN KEY ("stockPlateId") REFERENCES "stock_plates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_offcutId_fkey"
  FOREIGN KEY ("offcutId") REFERENCES "stock_offcuts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
