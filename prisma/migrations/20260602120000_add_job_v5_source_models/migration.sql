-- CreateTable
CREATE TABLE "job_v5" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "musteriId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "customerAddress" TEXT NOT NULL DEFAULT '',
    "customerType" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_v5_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_v5_areas" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "areaType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_v5_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_v5_material_selections" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "materialName" TEXT NOT NULL DEFAULT '',
    "brand" TEXT,
    "collection" TEXT,
    "color" TEXT,
    "finish" TEXT,
    "thicknessMm" DECIMAL(65,30),
    "slabWidthCm" DECIMAL(65,30),
    "slabHeightCm" DECIMAL(65,30),
    "unitCost" DECIMAL(65,30),
    "currency" TEXT,
    "stockPlateId" TEXT,
    "stockOffcutId" TEXT,
    "stockPurchaseId" TEXT,
    "snapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_v5_material_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_v5_products" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "productType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultMaterialSelectionId" TEXT,

    CONSTRAINT "job_v5_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_v5_pieces" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "pieceType" TEXT,
    "widthCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "heightCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "areaCm2" DECIMAL(65,30),
    "linearMeter" DECIMAL(65,30),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "materialSelectionId" TEXT,

    CONSTRAINT "job_v5_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_v5_atolyeId_idx" ON "job_v5"("atolyeId");

-- CreateIndex
CREATE INDEX "job_v5_musteriId_idx" ON "job_v5"("musteriId");

-- CreateIndex
CREATE INDEX "job_v5_atolyeId_status_idx" ON "job_v5"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "job_v5_areas_jobId_idx" ON "job_v5_areas"("jobId");

-- CreateIndex
CREATE INDEX "job_v5_areas_jobId_sortOrder_idx" ON "job_v5_areas"("jobId", "sortOrder");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_jobId_idx" ON "job_v5_material_selections"("jobId");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_source_idx" ON "job_v5_material_selections"("source");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_materialName_idx" ON "job_v5_material_selections"("materialName");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_stockPlateId_idx" ON "job_v5_material_selections"("stockPlateId");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_stockOffcutId_idx" ON "job_v5_material_selections"("stockOffcutId");

-- CreateIndex
CREATE INDEX "job_v5_material_selections_stockPurchaseId_idx" ON "job_v5_material_selections"("stockPurchaseId");

-- CreateIndex
CREATE INDEX "job_v5_products_jobId_idx" ON "job_v5_products"("jobId");

-- CreateIndex
CREATE INDEX "job_v5_products_areaId_idx" ON "job_v5_products"("areaId");

-- CreateIndex
CREATE INDEX "job_v5_products_defaultMaterialSelectionId_idx" ON "job_v5_products"("defaultMaterialSelectionId");

-- CreateIndex
CREATE INDEX "job_v5_products_jobId_sortOrder_idx" ON "job_v5_products"("jobId", "sortOrder");

-- CreateIndex
CREATE INDEX "job_v5_pieces_jobId_idx" ON "job_v5_pieces"("jobId");

-- CreateIndex
CREATE INDEX "job_v5_pieces_areaId_idx" ON "job_v5_pieces"("areaId");

-- CreateIndex
CREATE INDEX "job_v5_pieces_productId_idx" ON "job_v5_pieces"("productId");

-- CreateIndex
CREATE INDEX "job_v5_pieces_materialSelectionId_idx" ON "job_v5_pieces"("materialSelectionId");

-- CreateIndex
CREATE INDEX "job_v5_pieces_jobId_sortOrder_idx" ON "job_v5_pieces"("jobId", "sortOrder");

-- AddForeignKey
ALTER TABLE "job_v5" ADD CONSTRAINT "job_v5_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5" ADD CONSTRAINT "job_v5_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Musteri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_areas" ADD CONSTRAINT "job_v5_areas_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_v5"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_material_selections" ADD CONSTRAINT "job_v5_material_selections_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_v5"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_products" ADD CONSTRAINT "job_v5_products_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_v5"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_products" ADD CONSTRAINT "job_v5_products_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "job_v5_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_products" ADD CONSTRAINT "job_v5_products_defaultMaterialSelectionId_fkey" FOREIGN KEY ("defaultMaterialSelectionId") REFERENCES "job_v5_material_selections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_pieces" ADD CONSTRAINT "job_v5_pieces_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_v5"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_pieces" ADD CONSTRAINT "job_v5_pieces_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "job_v5_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_pieces" ADD CONSTRAINT "job_v5_pieces_productId_fkey" FOREIGN KEY ("productId") REFERENCES "job_v5_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_v5_pieces" ADD CONSTRAINT "job_v5_pieces_materialSelectionId_fkey" FOREIGN KEY ("materialSelectionId") REFERENCES "job_v5_material_selections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
