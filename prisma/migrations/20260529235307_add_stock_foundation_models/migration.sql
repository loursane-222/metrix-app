-- CreateTable
CREATE TABLE "stock_warehouses" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_purchases" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "purchaseCode" TEXT NOT NULL,
    "isId" TEXT,
    "supplierName" TEXT,
    "productName" TEXT NOT NULL,
    "materialType" TEXT,
    "widthCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "heightCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "warehouseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "expectedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdStockPlateIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_plates" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "plateCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "materialType" TEXT,
    "brand" TEXT,
    "colorName" TEXT,
    "batchNo" TEXT,
    "supplierName" TEXT,
    "warehouseId" TEXT,
    "widthCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "heightCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "thicknessMm" DECIMAL(65,30),
    "totalAreaCm2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingAreaCm2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "purchaseCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "purchaseUnitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "purchaseTotalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "sourceType" TEXT,
    "sourceJobId" TEXT,
    "stockPurchaseId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_plates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "stockPlateId" TEXT NOT NULL,
    "isId" TEXT,
    "schedulePhaseId" TEXT,
    "reservedAreaCm2" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "stockPlateId" TEXT,
    "offcutId" TEXT,
    "movementType" TEXT NOT NULL,
    "quantityAreaCm2" DECIMAL(65,30),
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "isId" TEXT,
    "reasonCode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_offcuts" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "parentPlateId" TEXT NOT NULL,
    "offcutCode" TEXT NOT NULL,
    "warehouseId" TEXT,
    "productName" TEXT NOT NULL,
    "materialType" TEXT,
    "widthCm" DECIMAL(65,30),
    "heightCm" DECIMAL(65,30),
    "areaCm2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingAreaCm2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "sourceJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_offcuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "stockPlateId" TEXT,
    "offcutId" TEXT,
    "areaCm2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costAmount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fire_records" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "isId" TEXT,
    "phaseExecutionId" TEXT,
    "stockPlateId" TEXT,
    "offcutId" TEXT,
    "fireType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reasonCode" TEXT,
    "areaCm2" DECIMAL(65,30),
    "estimatedCost" DECIMAL(65,30),
    "finalCost" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "note" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fire_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_warehouses_atolyeId_idx" ON "stock_warehouses"("atolyeId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_purchases_atolyeId_purchaseCode_key" ON "stock_purchases"("atolyeId", "purchaseCode");

-- CreateIndex
CREATE INDEX "stock_purchases_atolyeId_idx" ON "stock_purchases"("atolyeId");

-- CreateIndex
CREATE INDEX "stock_purchases_atolyeId_status_idx" ON "stock_purchases"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "stock_purchases_atolyeId_isId_idx" ON "stock_purchases"("atolyeId", "isId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_plates_atolyeId_plateCode_key" ON "stock_plates"("atolyeId", "plateCode");

-- CreateIndex
CREATE INDEX "stock_plates_atolyeId_productName_idx" ON "stock_plates"("atolyeId", "productName");

-- CreateIndex
CREATE INDEX "stock_plates_atolyeId_status_idx" ON "stock_plates"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "stock_plates_atolyeId_warehouseId_idx" ON "stock_plates"("atolyeId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_plates_atolyeId_materialType_idx" ON "stock_plates"("atolyeId", "materialType");

-- CreateIndex
CREATE INDEX "stock_plates_atolyeId_stockPurchaseId_idx" ON "stock_plates"("atolyeId", "stockPurchaseId");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_idx" ON "stock_reservations"("atolyeId");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_stockPlateId_idx" ON "stock_reservations"("atolyeId", "stockPlateId");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_isId_idx" ON "stock_reservations"("atolyeId", "isId");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_schedulePhaseId_idx" ON "stock_reservations"("atolyeId", "schedulePhaseId");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_status_idx" ON "stock_reservations"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "stock_movements_atolyeId_stockPlateId_idx" ON "stock_movements"("atolyeId", "stockPlateId");

-- CreateIndex
CREATE INDEX "stock_movements_atolyeId_isId_idx" ON "stock_movements"("atolyeId", "isId");

-- CreateIndex
CREATE INDEX "stock_movements_atolyeId_offcutId_idx" ON "stock_movements"("atolyeId", "offcutId");

-- CreateIndex
CREATE INDEX "stock_movements_atolyeId_movementType_idx" ON "stock_movements"("atolyeId", "movementType");

-- CreateIndex
CREATE UNIQUE INDEX "stock_offcuts_atolyeId_offcutCode_key" ON "stock_offcuts"("atolyeId", "offcutCode");

-- CreateIndex
CREATE INDEX "stock_offcuts_atolyeId_parentPlateId_idx" ON "stock_offcuts"("atolyeId", "parentPlateId");

-- CreateIndex
CREATE INDEX "stock_offcuts_atolyeId_productName_idx" ON "stock_offcuts"("atolyeId", "productName");

-- CreateIndex
CREATE INDEX "stock_offcuts_atolyeId_status_idx" ON "stock_offcuts"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "stock_offcuts_atolyeId_warehouseId_idx" ON "stock_offcuts"("atolyeId", "warehouseId");

-- CreateIndex
CREATE INDEX "material_consumptions_atolyeId_isId_idx" ON "material_consumptions"("atolyeId", "isId");

-- CreateIndex
CREATE INDEX "material_consumptions_atolyeId_stockPlateId_idx" ON "material_consumptions"("atolyeId", "stockPlateId");

-- CreateIndex
CREATE INDEX "material_consumptions_atolyeId_offcutId_idx" ON "material_consumptions"("atolyeId", "offcutId");

-- CreateIndex
CREATE INDEX "fire_records_atolyeId_isId_idx" ON "fire_records"("atolyeId", "isId");

-- CreateIndex
CREATE INDEX "fire_records_atolyeId_status_idx" ON "fire_records"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "fire_records_atolyeId_stockPlateId_idx" ON "fire_records"("atolyeId", "stockPlateId");

-- CreateIndex
CREATE INDEX "fire_records_atolyeId_offcutId_idx" ON "fire_records"("atolyeId", "offcutId");

-- CreateIndex
CREATE INDEX "fire_records_atolyeId_phaseExecutionId_idx" ON "fire_records"("atolyeId", "phaseExecutionId");
