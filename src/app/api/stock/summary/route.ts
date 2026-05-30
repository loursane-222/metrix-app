import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";

function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function stockValue(plate: { purchaseTotalCost: unknown; totalAreaCm2: unknown; remainingAreaCm2: unknown; status?: unknown }) {
  const status = String(plate.status || "").toUpperCase();
  if (["USED", "BROKEN", "SCRAPPED"].includes(status)) return 0;
  const total = n(plate.purchaseTotalCost);
  const totalArea = n(plate.totalAreaCm2);
  const remainingArea = n(plate.remainingAreaCm2);
  if (totalArea > 0 && remainingArea >= 0) return total * Math.min(remainingArea / totalArea, 1);
  return total;
}

function emptyProduct(productName: string, materialType: string | null) {
  return {
    productName,
    materialType,
    totalPlateCount: 0,
    availablePlateCount: 0,
    reservedPlateCount: 0,
    partialPlateCount: 0,
    brokenPlateCount: 0,
    offcutCount: 0,
    totalRemainingAreaCm2: 0,
    totalStockValue: 0,
    shadeGroups: [] as Array<{ shadeCode: string; plateCount: number }>,
    warehouses: [] as Array<{ warehouseId: string | null; name: string; plateCount: number }>,
  };
}

export async function GET() {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const [warehouses, plates, offcuts, purchases, fireRecords] = await Promise.all([
      prisma.stockWarehouse.findMany({
        where: { atolyeId: auth.atolyeId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.stockPlate.findMany({
        where: { atolyeId: auth.atolyeId },
        orderBy: [{ productName: "asc" }, { plateCode: "asc" }],
      }),
      prisma.stockOffcut.findMany({
        where: { atolyeId: auth.atolyeId },
        orderBy: [{ productName: "asc" }, { offcutCode: "asc" }],
      }),
      prisma.stockPurchase.findMany({
        where: { atolyeId: auth.atolyeId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.fireRecord.findMany({
        where: { atolyeId: auth.atolyeId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const warehouseName = new Map(warehouses.map((w) => [w.id, w.name]));
    const products = new Map<string, ReturnType<typeof emptyProduct> & { warehouseCounts: Map<string, number>; shadeCounts: Map<string, number> }>();

    for (const plate of plates) {
      const key = `${plate.productName}::${plate.materialType ?? ""}`;
      if (!products.has(key)) {
        products.set(key, { ...emptyProduct(plate.productName, plate.materialType), warehouseCounts: new Map(), shadeCounts: new Map() });
      }
      const row = products.get(key)!;
      const status = String(plate.status || "").toUpperCase();
      row.totalPlateCount += 1;
      if (status === "AVAILABLE") row.availablePlateCount += 1;
      if (status === "RESERVED") row.reservedPlateCount += 1;
      if (status === "PARTIAL") row.partialPlateCount += 1;
      if (status === "BROKEN" || status === "SCRAPPED") row.brokenPlateCount += 1;
      row.totalRemainingAreaCm2 += n(plate.remainingAreaCm2);
      row.totalStockValue += stockValue(plate);

      const warehouseKey = plate.warehouseId ?? "__none";
      row.warehouseCounts.set(warehouseKey, (row.warehouseCounts.get(warehouseKey) ?? 0) + 1);
      const shadeKey = plate.shadeCode?.trim() || "Belirtilmedi";
      row.shadeCounts.set(shadeKey, (row.shadeCounts.get(shadeKey) ?? 0) + 1);
    }

    for (const offcut of offcuts) {
      const key = `${offcut.productName}::${offcut.materialType ?? ""}`;
      if (!products.has(key)) {
        products.set(key, { ...emptyProduct(offcut.productName, offcut.materialType), warehouseCounts: new Map(), shadeCounts: new Map() });
      }
      const row = products.get(key)!;
      row.offcutCount += 1;
      row.totalRemainingAreaCm2 += n(offcut.remainingAreaCm2);
    }

    const productRows = [...products.values()]
      .map(({ warehouseCounts, shadeCounts, ...row }) => ({
        ...row,
        totalRemainingAreaM2: row.totalRemainingAreaCm2 / 10_000,
        shadeGroups: [...shadeCounts.entries()]
          .map(([shadeCode, plateCount]) => ({ shadeCode, plateCount }))
          .sort((a, b) => b.plateCount - a.plateCount || a.shadeCode.localeCompare(b.shadeCode, "tr")),
        warehouses: [...warehouseCounts.entries()].map(([id, plateCount]) => ({
          warehouseId: id === "__none" ? null : id,
          name: id === "__none" ? "Depo belirtilmedi" : warehouseName.get(id) ?? "Bilinmeyen depo",
          plateCount,
        })),
      }))
      .sort((a, b) => b.totalStockValue - a.totalStockValue || a.productName.localeCompare(b.productName, "tr"));

    const totals = {
      productCount: productRows.length,
      warehouseCount: warehouses.length,
      totalPlateCount: plates.length,
      availablePlateCount: plates.filter((p) => String(p.status).toUpperCase() === "AVAILABLE").length,
      reservedPlateCount: plates.filter((p) => String(p.status).toUpperCase() === "RESERVED").length,
      partialPlateCount: plates.filter((p) => String(p.status).toUpperCase() === "PARTIAL").length,
      brokenPlateCount: plates.filter((p) => ["BROKEN", "SCRAPPED"].includes(String(p.status).toUpperCase())).length,
      offcutCount: offcuts.length,
      fireRecordCount: fireRecords.length,
      openFireRecordCount: fireRecords.filter((r) => String(r.status).toUpperCase() !== "RESOLVED").length,
      pendingPurchaseCount: purchases.filter((p) => !["COMPLETED", "RECEIVED", "CANCELLED"].includes(String(p.status).toUpperCase())).length,
      totalRemainingAreaCm2: productRows.reduce((sum, p) => sum + p.totalRemainingAreaCm2, 0),
      totalStockValue: productRows.reduce((sum, p) => sum + p.totalStockValue, 0),
    };

    return NextResponse.json({
      totals,
      products: productRows,
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        isDefault: w.isDefault,
        isActive: w.isActive,
      })),
      recentPurchases: purchases.map((p) => ({
        id: p.id,
        purchaseCode: p.purchaseCode,
        productName: p.productName,
        supplierName: p.supplierName,
        quantity: p.quantity,
        status: p.status,
        totalCost: n(p.totalCost),
        currency: p.currency,
        expectedDate: p.expectedDate,
        completedAt: p.completedAt,
      })),
      recentFireRecords: fireRecords.map((r) => ({
        id: r.id,
        fireType: r.fireType,
        status: r.status,
        reasonCode: r.reasonCode,
        finalCost: r.finalCost != null ? n(r.finalCost) : null,
        estimatedCost: r.estimatedCost != null ? n(r.estimatedCost) : null,
        currency: r.currency,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[stock/summary]", error);
    return NextResponse.json({ error: "Stok özeti alınamadı" }, { status: 500 });
  }
}
