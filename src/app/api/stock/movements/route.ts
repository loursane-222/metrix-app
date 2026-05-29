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

    const where: any = { atolyeId: auth.atolyeId };
    if (stockPlateId) where.stockPlateId = stockPlateId;
    if (offcutId) where.offcutId = offcutId;

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      movements: movements.map((m) => ({
        id: m.id,
        stockPlateId: m.stockPlateId,
        offcutId: m.offcutId,
        movementType: m.movementType,
        quantityAreaCm2: n(m.quantityAreaCm2),
        fromWarehouseId: m.fromWarehouseId,
        toWarehouseId: m.toWarehouseId,
        isId: m.isId,
        reasonCode: m.reasonCode,
        note: m.note,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("[stock/movements]", error);
    return NextResponse.json({ error: "Stok hareketleri alınamadı" }, { status: 500 });
  }
}
