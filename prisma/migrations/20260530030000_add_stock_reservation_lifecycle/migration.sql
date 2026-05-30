ALTER TABLE "stock_reservations"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX "stock_reservations_atolyeId_isId_stockPlateId_status_idx"
ON "stock_reservations"("atolyeId", "isId", "stockPlateId", "status");

CREATE UNIQUE INDEX "stock_reservations_one_active_plate"
ON "stock_reservations"("atolyeId", "stockPlateId")
WHERE status = 'ACTIVE';
