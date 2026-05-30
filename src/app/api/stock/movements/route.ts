import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";

function n(value: unknown) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stockPlateId = searchParams.get("stockPlateId")?.trim();
    const offcutId = searchParams.get("offcutId")?.trim();
    const movementType = searchParams.get("movementType")?.trim();

    const where: any = { atolyeId: auth.atolyeId };
    if (stockPlateId) where.stockPlateId = stockPlateId;
    if (offcutId) where.offcutId = offcutId;
    if (movementType) where.movementType = movementType;

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const plateIds = [...new Set(movements.map((m) => m.stockPlateId).filter(Boolean))] as string[];
    const warehouseIds = [
      ...new Set(
        movements
          .flatMap((m) => [m.fromWarehouseId, m.toWarehouseId])
          .filter(Boolean),
      ),
    ] as string[];
    const jobIds = [...new Set(movements.map((m) => m.isId).filter(Boolean))] as string[];

    const [plates, warehouses, jobs] = await Promise.all([
      plateIds.length
        ? prisma.stockPlate.findMany({
            where: { atolyeId: auth.atolyeId, id: { in: plateIds } },
            select: { id: true, plateCode: true, productName: true, materialType: true, shadeCode: true, warehouseId: true },
          })
        : Promise.resolve([]),
      warehouseIds.length
        ? prisma.stockWarehouse.findMany({
            where: { atolyeId: auth.atolyeId, id: { in: warehouseIds } },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
      jobIds.length
        ? prisma.is.findMany({
            where: { atolyeId: auth.atolyeId, id: { in: jobIds } },
            select: { id: true, musteriAdi: true, urunAdi: true, teklifNo: true },
          })
        : Promise.resolve([]),
    ]);

    const plateMap = new Map(plates.map((p) => [p.id, p]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
    const jobMap = new Map(jobs.map((job) => [job.id, job]));

    return NextResponse.json({
      movements: movements.map((m) => {
        const plate = m.stockPlateId ? plateMap.get(m.stockPlateId) : null;
        const fromWarehouse = m.fromWarehouseId ? warehouseMap.get(m.fromWarehouseId) : null;
        const toWarehouse = m.toWarehouseId ? warehouseMap.get(m.toWarehouseId) : null;
        const job = m.isId ? jobMap.get(m.isId) : null;
        return {
          id: m.id,
          stockPlateId: m.stockPlateId,
          offcutId: m.offcutId,
          movementType: m.movementType,
          quantityAreaCm2: n(m.quantityAreaCm2),
          fromWarehouseId: m.fromWarehouseId,
          fromWarehouseName: fromWarehouse?.name ?? null,
          toWarehouseId: m.toWarehouseId,
          toWarehouseName: toWarehouse?.name ?? null,
          warehouseName: toWarehouse?.name ?? fromWarehouse?.name ?? null,
          isId: m.isId,
          jobId: m.isId,
          customerName: job?.musteriAdi ?? null,
          jobProductName: job?.urunAdi ?? null,
          offerNo: job?.teklifNo ?? null,
          plateCode: plate?.plateCode ?? null,
          productName: plate?.productName ?? job?.urunAdi ?? null,
          materialType: plate?.materialType ?? null,
          shadeCode: plate?.shadeCode ?? null,
          reasonCode: m.reasonCode,
          note: m.note,
          createdAt: m.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("[stock/movements]", error);
    return NextResponse.json({ error: "Stok hareketleri alınamadı" }, { status: 500 });
  }
}
