import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { n, normalizeStatus, parsePurchaseInput } from "@/lib/stock/purchases";

function serializePurchase(purchase: any) {
  return {
    id: purchase.id,
    purchaseCode: purchase.purchaseCode,
    isId: purchase.isId,
    supplierName: purchase.supplierName,
    productName: purchase.productName,
    materialType: purchase.materialType,
    widthCm: n(purchase.widthCm),
    heightCm: n(purchase.heightCm),
    quantity: purchase.quantity,
    currency: purchase.currency,
    unitCost: n(purchase.unitCost),
    totalCost: n(purchase.totalCost),
    warehouseId: purchase.warehouseId,
    status: purchase.status,
    expectedDate: purchase.expectedDate,
    completedAt: purchase.completedAt,
    createdStockPlateIds: Array.isArray(purchase.createdStockPlateIds) ? purchase.createdStockPlateIds : [],
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const requestedStatus = normalizeStatus(body?.status);

    const purchase = await prisma.stockPurchase.findFirst({
      where: { id, atolyeId: auth.atolyeId },
    });
    if (!purchase) return NextResponse.json({ error: "Satın alma kaydı bulunamadı" }, { status: 404 });

    const currentStatus = String(purchase.status).toUpperCase();
    if (["RECEIVED", "CANCELLED"].includes(currentStatus)) {
      return NextResponse.json({ error: "Tamamlanmış veya iptal edilmiş kayıt güncellenemez" }, { status: 409 });
    }

    const data: any = {};
    if (requestedStatus) {
      if (requestedStatus === "RECEIVED") {
        return NextResponse.json({ error: "Teslim alma için receive endpoint kullanılmalı" }, { status: 400 });
      }
      if (requestedStatus === "PLANNED" && currentStatus !== "ORDERED") {
        return NextResponse.json({ error: "Geçersiz durum geçişi" }, { status: 400 });
      }
      if (requestedStatus === "ORDERED" && currentStatus !== "PLANNED") {
        return NextResponse.json({ error: "Sadece planlı kayıt siparişe alınabilir" }, { status: 400 });
      }
      if (requestedStatus === "CANCELLED" && !["PLANNED", "ORDERED"].includes(currentStatus)) {
        return NextResponse.json({ error: "Bu kayıt iptal edilemez" }, { status: 400 });
      }
      data.status = requestedStatus;
    }

    if (body?.updateFields) {
      const parsed = parsePurchaseInput(body);
      if (parsed.errors.length > 0) {
        return NextResponse.json({ error: parsed.errors.join(" ") }, { status: 400 });
      }
      if (parsed.data.warehouseId) {
        const warehouse = await prisma.stockWarehouse.findFirst({
          where: { id: parsed.data.warehouseId, atolyeId: auth.atolyeId, isActive: true },
          select: { id: true },
        });
        if (!warehouse) return NextResponse.json({ error: "Depo bulunamadı" }, { status: 404 });
      }
      if (parsed.data.isId) {
        const job = await prisma.is.findFirst({
          where: { id: parsed.data.isId, atolyeId: auth.atolyeId },
          select: { id: true },
        });
        if (!job) return NextResponse.json({ error: "İlişkili iş bulunamadı" }, { status: 404 });
      }
      Object.assign(data, parsed.data);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ purchase: serializePurchase(purchase) });
    }

    const updated = await prisma.stockPurchase.update({
      where: { id: purchase.id },
      data,
    });

    return NextResponse.json({ purchase: serializePurchase(updated) });
  } catch (error) {
    console.error("[stock/purchases/[id]][PATCH]", error);
    return NextResponse.json({ error: "Satın alma kaydı güncellenemedi" }, { status: 500 });
  }
}
