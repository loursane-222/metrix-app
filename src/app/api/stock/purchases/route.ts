import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { n, normalizeStatus, parsePurchaseInput, purchaseCode } from "@/lib/stock/purchases";
import { notifyStockEntryCreated } from "@/lib/stockNotifications";

function serializePurchase(purchase: any, jobMap = new Map<string, any>(), warehouseMap = new Map<string, any>()) {
  const job = purchase.isId ? jobMap.get(purchase.isId) : null;
  const warehouse = purchase.warehouseId ? warehouseMap.get(purchase.warehouseId) : null;
  return {
    id: purchase.id,
    purchaseCode: purchase.purchaseCode,
    isId: purchase.isId,
    jobId: purchase.isId,
    customerName: job?.musteriAdi ?? null,
    jobProductName: job?.urunAdi ?? null,
    offerNo: job?.teklifNo ?? null,
    supplierName: purchase.supplierName,
    productName: purchase.productName,
    materialType: purchase.materialType,
    widthCm: n(purchase.widthCm),
    heightCm: n(purchase.heightCm),
    quantity: purchase.quantity,
    currency: purchase.currency,
    unitCost: n(purchase.unitCost),
    totalCost: n(purchase.totalCost),
    purchaseFxRate: n(purchase.purchaseFxRate) || 1,
    warehouseId: purchase.warehouseId,
    warehouseName: warehouse?.name ?? null,
    status: purchase.status,
    expectedDate: purchase.expectedDate,
    completedAt: purchase.completedAt,
    createdStockPlateIds: Array.isArray(purchase.createdStockPlateIds) ? purchase.createdStockPlateIds : [],
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get("status"));
    const where: any = { atolyeId: auth.atolyeId };
    if (status) where.status = status;

    const purchases = await prisma.stockPurchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    const jobIds = [...new Set(purchases.map((p) => p.isId).filter(Boolean))] as string[];
    const warehouseIds = [...new Set(purchases.map((p) => p.warehouseId).filter(Boolean))] as string[];
    const [jobs, warehouses] = await Promise.all([
      jobIds.length
        ? prisma.is.findMany({
            where: { atolyeId: auth.atolyeId, id: { in: jobIds } },
            select: { id: true, musteriAdi: true, urunAdi: true, teklifNo: true },
          })
        : Promise.resolve([]),
      warehouseIds.length
        ? prisma.stockWarehouse.findMany({
            where: { atolyeId: auth.atolyeId, id: { in: warehouseIds } },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
    ]);

    const jobMap = new Map(jobs.map((job) => [job.id, job]));
    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

    return NextResponse.json({
      purchases: purchases.map((purchase) => serializePurchase(purchase, jobMap, warehouseMap)),
    });
  } catch (error) {
    console.error("[stock/purchases][GET]", error);
    return NextResponse.json({ error: "Satın alma kayıtları alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json();
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

    const purchase = await prisma.stockPurchase.create({
      data: {
        atolyeId: auth.atolyeId,
        purchaseCode: purchaseCode(),
        ...parsed.data,
        status: "PLANNED",
      },
    });

    await notifyStockEntryCreated({
      atolyeId: auth.atolyeId,
      userId: auth.role === "admin" ? auth.userId : undefined,
      personelId: auth.personelId,
      refId: purchase.id,
      productName: purchase.productName,
      purchaseId: purchase.id,
      purchaseCode: purchase.purchaseCode,
      quantity: purchase.quantity,
      amount: n(purchase.totalCost),
      currency: purchase.currency,
      action: "purchase_created",
      jobId: purchase.isId,
      message: `Satın alma kaydı oluşturuldu: ${purchase.productName}, ${purchase.quantity} plaka, ${n(purchase.totalCost).toLocaleString("tr-TR")} ${purchase.currency}.`,
    });

    return NextResponse.json({ purchase: serializePurchase(purchase) }, { status: 201 });
  } catch (error) {
    console.error("[stock/purchases][POST]", error);
    return NextResponse.json({ error: "Satın alma kaydı oluşturulamadı" }, { status: 500 });
  }
}
