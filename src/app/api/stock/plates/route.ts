import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";

function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productName = searchParams.get("productName")?.trim();
    const status = searchParams.get("status")?.trim();
    const warehouseId = searchParams.get("warehouseId")?.trim();
    const materialType = searchParams.get("materialType")?.trim();
    const q = searchParams.get("q")?.trim();

    const where: any = { atolyeId: auth.atolyeId };
    if (productName) where.productName = productName;
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (materialType) where.materialType = materialType;
    if (q) {
      where.OR = [
        { plateCode: { contains: q, mode: "insensitive" } },
        { productName: { contains: q, mode: "insensitive" } },
        { materialType: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { colorName: { contains: q, mode: "insensitive" } },
        { batchNo: { contains: q, mode: "insensitive" } },
      ];
    }

    const plates = await prisma.stockPlate.findMany({
      where,
      orderBy: [{ productName: "asc" }, { plateCode: "asc" }],
      take: 300,
    });

    const warehouseIds = [...new Set(plates.map((p) => p.warehouseId).filter(Boolean))] as string[];
    const warehouses = warehouseIds.length
      ? await prisma.stockWarehouse.findMany({
          where: { atolyeId: auth.atolyeId, id: { in: warehouseIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    return NextResponse.json({
      plates: plates.map((p) => {
        const warehouse = p.warehouseId ? warehouseMap.get(p.warehouseId) : null;
        return {
          id: p.id,
          plateCode: p.plateCode,
          productName: p.productName,
          materialType: p.materialType,
          brand: p.brand,
          colorName: p.colorName,
          batchNo: p.batchNo,
          supplierName: p.supplierName,
          warehouseId: p.warehouseId,
          warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, code: warehouse.code } : null,
          widthCm: n(p.widthCm),
          heightCm: n(p.heightCm),
          thicknessMm: p.thicknessMm != null ? n(p.thicknessMm) : null,
          totalAreaCm2: n(p.totalAreaCm2),
          remainingAreaCm2: n(p.remainingAreaCm2),
          remainingAreaM2: n(p.remainingAreaCm2) / 10_000,
          purchaseCurrency: p.purchaseCurrency,
          purchaseUnitCost: n(p.purchaseUnitCost),
          purchaseTotalCost: n(p.purchaseTotalCost),
          status: p.status,
          sourceType: p.sourceType,
          sourceJobId: p.sourceJobId,
          stockPurchaseId: p.stockPurchaseId,
          notes: p.notes,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error("[stock/plates]", error);
    return NextResponse.json({ error: "Plaka listesi alınamadı" }, { status: 500 });
  }
}
