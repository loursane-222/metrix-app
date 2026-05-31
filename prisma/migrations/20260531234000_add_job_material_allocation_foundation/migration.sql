-- CreateTable
CREATE TABLE "job_material_requirements" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "materialType" TEXT,
    "requiredQuantity" INTEGER,
    "requiredAreaCm2" DECIMAL(65,30),
    "shadePolicy" TEXT NOT NULL DEFAULT 'MIX_ALLOWED',
    "preferredShadeCode" TEXT,
    "preferredLotNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_material_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_material_allocations" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stockPlateId" TEXT,
    "offcutId" TEXT,
    "allocatedAreaCm2" DECIMAL(65,30),
    "allocatedPieces" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'STOCK_PLATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_material_allocations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "stock_reservations" ADD COLUMN "materialAllocationId" TEXT;

-- CreateIndex
CREATE INDEX "job_material_requirements_atolyeId_idx" ON "job_material_requirements"("atolyeId");

-- CreateIndex
CREATE INDEX "job_material_requirements_atolyeId_jobId_idx" ON "job_material_requirements"("atolyeId", "jobId");

-- CreateIndex
CREATE INDEX "job_material_requirements_atolyeId_status_idx" ON "job_material_requirements"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "job_material_requirements_atolyeId_productName_idx" ON "job_material_requirements"("atolyeId", "productName");

-- CreateIndex
CREATE INDEX "job_material_requirements_atolyeId_shadePolicy_idx" ON "job_material_requirements"("atolyeId", "shadePolicy");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_idx" ON "job_material_allocations"("atolyeId");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_requirementId_idx" ON "job_material_allocations"("atolyeId", "requirementId");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_jobId_idx" ON "job_material_allocations"("atolyeId", "jobId");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_stockPlateId_idx" ON "job_material_allocations"("atolyeId", "stockPlateId");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_offcutId_idx" ON "job_material_allocations"("atolyeId", "offcutId");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_status_idx" ON "job_material_allocations"("atolyeId", "status");

-- CreateIndex
CREATE INDEX "job_material_allocations_atolyeId_source_idx" ON "job_material_allocations"("atolyeId", "source");

-- CreateIndex
CREATE INDEX "stock_reservations_atolyeId_materialAllocationId_idx" ON "stock_reservations"("atolyeId", "materialAllocationId");

-- AddForeignKey
ALTER TABLE "job_material_requirements" ADD CONSTRAINT "job_material_requirements_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Is"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_material_allocations" ADD CONSTRAINT "job_material_allocations_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "job_material_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_material_allocations" ADD CONSTRAINT "job_material_allocations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Is"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_material_allocations" ADD CONSTRAINT "job_material_allocations_stockPlateId_fkey" FOREIGN KEY ("stockPlateId") REFERENCES "stock_plates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_material_allocations" ADD CONSTRAINT "job_material_allocations_offcutId_fkey" FOREIGN KEY ("offcutId") REFERENCES "stock_offcuts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_materialAllocationId_fkey" FOREIGN KEY ("materialAllocationId") REFERENCES "job_material_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
