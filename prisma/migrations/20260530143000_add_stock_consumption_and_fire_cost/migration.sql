ALTER TABLE "Is"
ADD COLUMN "operasyonelFireMaliyeti" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "stock_reservations"
ADD COLUMN "consumedAt" TIMESTAMP(3);
