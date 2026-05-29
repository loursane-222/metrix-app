-- Additive foundation for connecting jobs to stock material source.
ALTER TABLE "Is"
ADD COLUMN "stoneSource" TEXT,
ADD COLUMN "selectedStockPlateId" TEXT,
ADD COLUMN "stockMaterialSnapshot" JSONB,
ADD COLUMN "customerOwnedMaterialNote" TEXT;
