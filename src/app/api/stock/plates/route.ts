import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { normalizeCurrency, stockCostFields } from "@/lib/stock/currency";

function n(value: unknown) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function text(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function safeCodePart(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  return normalized.slice(0, 18) || "MANUEL";
}

async function nextManualPlateCode(tx: Prisma.TransactionClient, atolyeId: string, productName: string, offset: number) {
  const prefix = `MAN-${safeCodePart(productName)}-`;
  const count = await tx.stockPlate.count({
    where: { atolyeId, plateCode: { startsWith: prefix } },
  });

  for (let index = count + offset + 1; index < count + offset + 1000; index += 1) {
    const plateCode = `${prefix}${String(index).padStart(4, "0")}`;
    const exists = await tx.stockPlate.findFirst({
      where: { atolyeId, plateCode },
      select: { id: true },
    });
    if (!exists) return plateCode;
  }

  return `${prefix}${Date.now()}-${offset + 1}`;
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
        { shadeCode: { contains: q, mode: "insensitive" } },
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
          shadeCode: p.shadeCode,
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
          purchaseOriginalCost: p.purchaseOriginalCost != null ? n(p.purchaseOriginalCost) : n(p.purchaseTotalCost),
          purchaseFxRate: n(p.purchaseFxRate) || 1,
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

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json();
    const productName = text(body.productName);
    const materialType = text(body.materialType);
    const widthCm = n(body.widthCm);
    const heightCm = n(body.heightCm);
    const purchaseOriginalCost = n(body.purchaseOriginalCost ?? body.purchaseTotalCost);
    const currency = normalizeCurrency(body.currency);
    const purchaseFxRate = n(body.purchaseFxRate);
    const quantity = Math.max(1, Math.min(100, Math.floor(n(body.quantity) || 1)));
    const shadeCode = text(body.shadeCode);
    const thicknessMm = body.thicknessMm == null || body.thicknessMm === "" ? null : n(body.thicknessMm);
    const supplierName = text(body.supplierName);
    const batchNo = text(body.batchNo);
    const notes = text(body.notes);
    const warehouseId = text(body.warehouseId);

    if (!productName) return NextResponse.json({ error: "Ürün adı zorunlu" }, { status: 400 });
    if (!materialType) return NextResponse.json({ error: "Malzeme tipi zorunlu" }, { status: 400 });
    if (widthCm <= 0 || heightCm <= 0) return NextResponse.json({ error: "En ve boy 0'dan büyük olmalı" }, { status: 400 });
    if (purchaseOriginalCost <= 0) return NextResponse.json({ error: "Alış toplam maliyeti 0'dan büyük olmalı" }, { status: 400 });
    if (currency !== "TRY" && purchaseFxRate <= 0) return NextResponse.json({ error: "Dövizli maliyet için alış kuru zorunlu" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      let warehouse = warehouseId
        ? await tx.stockWarehouse.findFirst({
            where: { id: warehouseId, atolyeId: auth.atolyeId, isActive: true },
          })
        : null;

      if (warehouseId && !warehouse) {
        return { status: 404 as const, body: { error: "Depo bulunamadı" } };
      }

      if (!warehouse) {
        warehouse =
          await tx.stockWarehouse.findFirst({
            where: { atolyeId: auth.atolyeId, isDefault: true, isActive: true },
            orderBy: { createdAt: "asc" },
          }) ??
          await tx.stockWarehouse.findFirst({
            where: { atolyeId: auth.atolyeId, isActive: true },
            orderBy: { createdAt: "asc" },
          });
      }

      if (!warehouse) {
        warehouse = await tx.stockWarehouse.create({
          data: {
            atolyeId: auth.atolyeId,
            name: "Ana Depo",
            code: "ANA",
            isDefault: true,
            isActive: true,
          },
        });
      }

      const totalAreaCm2 = widthCm * heightCm;
      const costs = stockCostFields({
        currency,
        originalCost: purchaseOriginalCost,
        fxRate: purchaseFxRate,
        quantity,
        totalAreaCm2,
      });
      const plates = [];

      for (let i = 0; i < quantity; i += 1) {
        const plateCode = await nextManualPlateCode(tx, auth.atolyeId, productName, i);
        const plate = await tx.stockPlate.create({
          data: {
            atolyeId: auth.atolyeId,
            plateCode,
            productName,
            materialType,
            shadeCode,
            supplierName,
            batchNo,
            warehouseId: warehouse.id,
            widthCm,
            heightCm,
            thicknessMm,
            totalAreaCm2,
            remainingAreaCm2: totalAreaCm2,
            purchaseCurrency: costs.currency,
            purchaseOriginalCost: costs.originalUnitCost,
            purchaseFxRate: costs.fxRate,
            purchaseUnitCost: costs.purchaseUnitCost,
            purchaseTotalCost: costs.unitCostTry,
            status: "AVAILABLE",
            sourceType: "MANUAL_CREATE",
            notes,
          },
        });

        await tx.stockMovement.create({
          data: {
            atolyeId: auth.atolyeId,
            stockPlateId: plate.id,
            movementType: "IN",
            quantityAreaCm2: totalAreaCm2,
            toWarehouseId: warehouse.id,
            reasonCode: "MANUAL_STOCK_CREATE",
            note: "Manuel ürün/plaka girişi",
          },
        });

        plates.push(plate);
      }

      return {
        status: 201 as const,
        body: {
          ok: true,
          createdPlateCount: plates.length,
          plates: plates.map((plate) => ({
            id: plate.id,
            plateCode: plate.plateCode,
            productName: plate.productName,
            materialType: plate.materialType,
            widthCm: n(plate.widthCm),
            heightCm: n(plate.heightCm),
            purchaseTotalCost: n(plate.purchaseTotalCost),
            purchaseOriginalCost: plate.purchaseOriginalCost != null ? n(plate.purchaseOriginalCost) : n(plate.purchaseTotalCost),
            purchaseFxRate: n(plate.purchaseFxRate) || 1,
            status: plate.status,
          })),
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[stock/plates][POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Plaka kodu çakıştı, lütfen tekrar deneyin" }, { status: 409 });
    }
    return NextResponse.json({ error: "Ürün/plaka oluşturulamadı" }, { status: 500 });
  }
}
