ALTER TABLE "stock_plates"
ADD COLUMN "purchaseOriginalCost" DECIMAL(65,30),
ADD COLUMN "purchaseFxRate" DECIMAL(65,30) NOT NULL DEFAULT 1;

UPDATE "stock_plates"
SET "purchaseOriginalCost" = "purchaseTotalCost",
    "purchaseFxRate" = 1
WHERE "purchaseOriginalCost" IS NULL;

ALTER TABLE "stock_purchases"
ADD COLUMN "purchaseFxRate" DECIMAL(65,30) NOT NULL DEFAULT 1;
