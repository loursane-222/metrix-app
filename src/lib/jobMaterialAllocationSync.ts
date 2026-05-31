import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type MaterialAllocationInput = {
  stockPlateId?: string | null;
  offcutId?: string | null;
  allocatedAreaCm2?: number | string | null;
  allocatedPieces?: number | string | null;
  status?: string | null;
  source?: string | null;
};

type MaterialRequirementInput = {
  productName?: string | null;
  materialType?: string | null;
  requiredQuantity?: number | string | null;
  requiredAreaCm2?: number | string | null;
  shadePolicy?: string | null;
  preferredShadeCode?: string | null;
  preferredLotNo?: string | null;
  status?: string | null;
  notes?: string | null;
  allocations?: MaterialAllocationInput[] | null;
};

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function text(value: unknown) {
  const str = String(value ?? "").trim();
  return str || null;
}

export async function syncJobMaterialAllocations(
  tx: Tx,
  input: { atolyeId: string; jobId: string; requirements?: MaterialRequirementInput[] | null },
) {
  if (!Array.isArray(input.requirements)) return;

  const existingRequirements = await tx.jobMaterialRequirement.findMany({
    where: { atolyeId: input.atolyeId, jobId: input.jobId },
    include: { allocations: { select: { status: true } } },
  });

  for (const requirement of existingRequirements) {
    const canReplaceRequirement =
      requirement.status === "PLANNED" &&
      requirement.allocations.every((allocation) => allocation.status === "DRAFT");

    if (canReplaceRequirement) {
      await tx.jobMaterialRequirement.delete({ where: { id: requirement.id } });
    } else {
      await tx.jobMaterialAllocation.deleteMany({
        where: {
          atolyeId: input.atolyeId,
          jobId: input.jobId,
          requirementId: requirement.id,
          status: "DRAFT",
        },
      });
    }
  }

  for (const requirementInput of input.requirements) {
    const allocationInputs = Array.isArray(requirementInput.allocations)
      ? requirementInput.allocations
      : [];
    const stockPlateIds = [...new Set(allocationInputs.map((allocation) => text(allocation.stockPlateId)).filter(Boolean))] as string[];
    const offcutIds = [...new Set(allocationInputs.map((allocation) => text(allocation.offcutId)).filter(Boolean))] as string[];

    const [plates, offcuts] = await Promise.all([
      stockPlateIds.length
        ? tx.stockPlate.findMany({
            where: { atolyeId: input.atolyeId, id: { in: stockPlateIds } },
            select: { id: true, productName: true, materialType: true, remainingAreaCm2: true },
          })
        : Promise.resolve([]),
      offcutIds.length
        ? tx.stockOffcut.findMany({
            where: { atolyeId: input.atolyeId, id: { in: offcutIds } },
            select: { id: true, productName: true, materialType: true, remainingAreaCm2: true },
          })
        : Promise.resolve([]),
    ]);

    const plateMap = new Map(plates.map((plate) => [plate.id, plate]));
    const offcutMap = new Map(offcuts.map((offcut) => [offcut.id, offcut]));
    const firstPlate = plates[0];
    const firstOffcut = offcuts[0];
    const productName = text(requirementInput.productName) ?? firstPlate?.productName ?? firstOffcut?.productName;
    if (!productName) continue;

    const validAllocations = allocationInputs
      .map((allocation) => {
        const stockPlateId = text(allocation.stockPlateId);
        const offcutId = text(allocation.offcutId);
        const plate = stockPlateId ? plateMap.get(stockPlateId) : null;
        const offcut = offcutId ? offcutMap.get(offcutId) : null;
        if (!plate && !offcut) return null;
        const allocatedAreaCm2 = n(allocation.allocatedAreaCm2) || n(plate?.remainingAreaCm2 ?? offcut?.remainingAreaCm2);
        return {
          stockPlateId: plate?.id ?? null,
          offcutId: offcut?.id ?? null,
          allocatedAreaCm2: allocatedAreaCm2 > 0 ? allocatedAreaCm2 : undefined,
          allocatedPieces: Math.max(1, Math.floor(n(allocation.allocatedPieces) || 1)),
          status: text(allocation.status) ?? "DRAFT",
          source: text(allocation.source) ?? (plate ? "STOCK_PLATE" : "OFFCUT"),
        };
      })
      .filter(Boolean) as Array<{
        stockPlateId: string | null;
        offcutId: string | null;
        allocatedAreaCm2?: number;
        allocatedPieces: number;
        status: string;
        source: string;
      }>;

    if (validAllocations.length === 0) continue;

    const requiredAreaCm2 =
      n(requirementInput.requiredAreaCm2) ||
      validAllocations.reduce((sum, allocation) => sum + n(allocation.allocatedAreaCm2), 0);

    await tx.jobMaterialRequirement.create({
      data: {
        atolyeId: input.atolyeId,
        jobId: input.jobId,
        productName,
        materialType: text(requirementInput.materialType) ?? firstPlate?.materialType ?? firstOffcut?.materialType ?? null,
        requiredQuantity: Math.max(1, Math.floor(n(requirementInput.requiredQuantity) || validAllocations.length)),
        requiredAreaCm2: requiredAreaCm2 > 0 ? requiredAreaCm2 : undefined,
        shadePolicy: text(requirementInput.shadePolicy) ?? "MIX_ALLOWED",
        preferredShadeCode: text(requirementInput.preferredShadeCode),
        preferredLotNo: text(requirementInput.preferredLotNo),
        status: text(requirementInput.status) ?? "PLANNED",
        notes: text(requirementInput.notes),
        allocations: {
          create: validAllocations.map((allocation) => ({
            atolyeId: input.atolyeId,
            jobId: input.jobId,
            stockPlateId: allocation.stockPlateId,
            offcutId: allocation.offcutId,
            allocatedAreaCm2: allocation.allocatedAreaCm2,
            allocatedPieces: allocation.allocatedPieces,
            status: allocation.status,
            source: allocation.source,
          })),
        },
      },
    });
  }
}
