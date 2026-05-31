import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { n, normalizeCurrency, stockCostFields } from "@/lib/stock/currency";

function text(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function serializePlate(plate: any) {
  return {
    id: plate.id,
    plateCode: plate.plateCode,
    productName: plate.productName,
    materialType: plate.materialType,
    shadeCode: plate.shadeCode,
    batchNo: plate.batchNo,
    thicknessMm: plate.thicknessMm != null ? n(plate.thicknessMm) : null,
    purchaseCurrency: plate.purchaseCurrency,
    purchaseOriginalCost: plate.purchaseOriginalCost != null ? n(plate.purchaseOriginalCost) : n(plate.purchaseTotalCost),
    purchaseFxRate: n(plate.purchaseFxRate) || 1,
    purchaseUnitCost: n(plate.purchaseUnitCost),
    purchaseTotalCost: n(plate.purchaseTotalCost),
    notes: plate.notes,
    updatedAt: plate.updatedAt,
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
    const plate = await prisma.stockPlate.findFirst({
      where: { id, atolyeId: auth.atolyeId },
    });
    if (!plate) return NextResponse.json({ error: "Plaka bulunamadı" }, { status: 404 });

    const productName = text(body.productName);
    const materialType = text(body.materialType);
    const currency = normalizeCurrency(body.purchaseCurrency ?? body.currency ?? plate.purchaseCurrency);
    const originalCost = n(body.purchaseOriginalCost ?? body.purchaseTotalCost ?? plate.purchaseOriginalCost ?? plate.purchaseTotalCost);
    const fxRate = currency === "TRY" ? 1 : n(body.purchaseFxRate ?? plate.purchaseFxRate);

    if (!productName) return NextResponse.json({ error: "Ürün adı zorunlu" }, { status: 400 });
    if (!materialType) return NextResponse.json({ error: "Malzeme tipi zorunlu" }, { status: 400 });
    if (originalCost <= 0) return NextResponse.json({ error: "Alış maliyeti 0'dan büyük olmalı" }, { status: 400 });
    if (currency !== "TRY" && fxRate <= 0) return NextResponse.json({ error: "Dövizli maliyet için alış kuru zorunlu" }, { status: 400 });

    const costs = stockCostFields({
      currency,
      originalCost,
      fxRate,
      quantity: 1,
      totalAreaCm2: plate.totalAreaCm2,
    });

    const updated = await prisma.stockPlate.update({
      where: { id: plate.id },
      data: {
        productName,
        materialType,
        shadeCode: text(body.shadeCode),
        thicknessMm: body.thicknessMm == null || body.thicknessMm === "" ? null : n(body.thicknessMm),
        purchaseCurrency: costs.currency,
        purchaseOriginalCost: costs.originalCost,
        purchaseFxRate: costs.fxRate,
        purchaseUnitCost: costs.purchaseUnitCost,
        purchaseTotalCost: costs.totalCostTry,
        batchNo: text(body.batchNo),
        notes: text(body.notes),
      },
    });

    return NextResponse.json({ plate: serializePlate(updated) });
  } catch (error) {
    console.error("[stock/plates/[id]][PATCH]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Plaka bilgisi çakıştı" }, { status: 409 });
    }
    return NextResponse.json({ error: "Plaka güncellenemedi" }, { status: 500 });
  }
}
