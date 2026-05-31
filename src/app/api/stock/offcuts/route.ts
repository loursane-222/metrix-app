import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import {
  OFFCUT_PARENT_PLATE_STATUSES,
  calculateOffcutMetrics,
  decimal,
  n,
  normalizeOffcutStatus,
  offcutCode,
  optionalText,
  serializeOffcut,
} from "@/lib/stock/offcuts";
import { notifyOffcutCreated } from "@/lib/stockNotifications";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productName = searchParams.get("productName")?.trim();
    const shadeCode = searchParams.get("shadeCode")?.trim();
    const status = normalizeOffcutStatus(searchParams.get("status"));
    const minWidthCm = Number(searchParams.get("minWidthCm") || 0);
    const minHeightCm = Number(searchParams.get("minHeightCm") || 0);

    const where: Prisma.StockOffcutWhereInput = { atolyeId: auth.atolyeId };
    if (productName) where.productName = { contains: productName, mode: "insensitive" };
    if (status) where.status = status;
    if (Number.isFinite(minWidthCm) && minWidthCm > 0) where.widthCm = { gte: minWidthCm };
    if (Number.isFinite(minHeightCm) && minHeightCm > 0) where.heightCm = { gte: minHeightCm };
    if (shadeCode) {
      where.parentPlate = { shadeCode: { contains: shadeCode, mode: "insensitive" } };
    }

    const offcuts = await prisma.stockOffcut.findMany({
      where,
      include: {
        parentPlate: { select: { id: true, plateCode: true, shadeCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const warehouseIds = [...new Set(offcuts.map((o) => o.warehouseId).filter(Boolean))] as string[];
    const warehouses = warehouseIds.length
      ? await prisma.stockWarehouse.findMany({
          where: { atolyeId: auth.atolyeId, id: { in: warehouseIds } },
          select: { id: true, name: true },
        })
      : [];
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    return NextResponse.json({
      offcuts: offcuts.map((offcut) =>
        serializeOffcut(offcut, offcut.parentPlate, offcut.warehouseId ? warehouseMap.get(offcut.warehouseId) : null),
      ),
    });
  } catch (error) {
    console.error("[stock/offcuts][GET]", error);
    return NextResponse.json({ error: "Offcut listesi alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json();
    const parentPlateId = String(body?.parentPlateId || "").trim();
    const widthCm = n(body?.widthCm);
    const heightCm = n(body?.heightCm);
    const notes = optionalText(body?.notes);

    if (!parentPlateId) return NextResponse.json({ error: "Parent plaka zorunlu" }, { status: 400 });
    if (widthCm <= 0 || heightCm <= 0) {
      return NextResponse.json({ error: "En ve boy 0'dan büyük olmalı" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.stockPlate.findFirst({
        where: { id: parentPlateId, atolyeId: auth.atolyeId },
      });
      if (!parent) return { status: 404 as const, body: { error: "Parent plaka bulunamadı" } };

      const parentStatus = String(parent.status || "").toUpperCase();
      if (!OFFCUT_PARENT_PLATE_STATUSES.includes(parentStatus as any)) {
        return { status: 409 as const, body: { error: "Bu plaka durumunda offcut oluşturulamaz" } };
      }

      const metrics = calculateOffcutMetrics({
        widthCm,
        heightCm,
        parentTotalAreaCm2: n(parent.totalAreaCm2),
        parentPurchaseTotalCost: n(parent.purchaseTotalCost),
      });

      if (metrics.areaCm2 <= 0) return { status: 400 as const, body: { error: "Offcut alanı geçersiz" } };
      if (metrics.areaCm2 > n(parent.remainingAreaCm2)) {
        return { status: 409 as const, body: { error: "Offcut alanı parent plakanın kalan alanını aşamaz" } };
      }

      const existingCount = await tx.stockOffcut.count({
        where: { atolyeId: auth.atolyeId, parentPlateId: parent.id },
      });

      const offcut = await tx.stockOffcut.create({
        data: {
          atolyeId: auth.atolyeId,
          parentPlateId: parent.id,
          offcutCode: offcutCode(parent.plateCode, existingCount),
          warehouseId: parent.warehouseId,
          productName: parent.productName,
          materialType: parent.materialType,
          widthCm: decimal(widthCm),
          heightCm: decimal(heightCm),
          areaCm2: decimal(metrics.areaCm2),
          remainingAreaCm2: decimal(metrics.areaCm2),
          costPerM2: decimal(metrics.costPerM2),
          totalCost: decimal(metrics.totalCost),
          currency: "TRY",
          status: "AVAILABLE",
          sourceJobId: parent.sourceJobId,
          notes,
        },
        include: { parentPlate: { select: { id: true, plateCode: true, shadeCode: true } } },
      });

      await tx.stockPlate.update({
        where: { id: parent.id },
        data: {
          remainingAreaCm2: decimal(Math.max(0, n(parent.remainingAreaCm2) - metrics.areaCm2)),
          status: parentStatus === "RESERVED" ? "RESERVED" : "PARTIAL",
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          atolyeId: auth.atolyeId,
          stockPlateId: parent.id,
          offcutId: offcut.id,
          movementType: "OFFCUT_CREATE",
          quantityAreaCm2: decimal(metrics.areaCm2),
          toWarehouseId: parent.warehouseId,
          isId: parent.sourceJobId,
          reasonCode: "OFFCUT_CREATED_FROM_PLATE",
          note: `Offcut oluşturuldu: ${offcut.offcutCode}`,
        },
      });

      return {
        status: 201 as const,
        body: {
          offcut: serializeOffcut(offcut, offcut.parentPlate),
          notification: {
            offcutId: offcut.id,
            offcutCode: offcut.offcutCode,
            stockPlateId: parent.id,
            stockMovementId: movement.id,
            jobId: parent.sourceJobId,
            amount: metrics.totalCost,
          },
        },
      };
    });

    if (result.status === 201 && result.body.notification) {
      await notifyOffcutCreated({
        atolyeId: auth.atolyeId,
        userId: auth.role === "admin" ? auth.userId : undefined,
        personelId: auth.personelId,
        refId: result.body.notification.offcutId,
        offcutIds: [result.body.notification.offcutId],
        offcutCodes: [result.body.notification.offcutCode],
        stockPlateId: result.body.notification.stockPlateId,
        stockMovementIds: [result.body.notification.stockMovementId],
        jobId: result.body.notification.jobId,
        amount: result.body.notification.amount,
        metadata: {
          action: "manual_offcut_created",
        },
      });
    }

    const { notification: _notification, ...responseBody } = result.body;
    return NextResponse.json(responseBody, { status: result.status });
  } catch (error) {
    console.error("[stock/offcuts][POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Offcut kodu çakıştı, lütfen tekrar deneyin" }, { status: 409 });
    }
    return NextResponse.json({ error: "Offcut oluşturulamadı" }, { status: 500 });
  }
}
