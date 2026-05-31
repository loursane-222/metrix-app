import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { ensureDraftReservationForJob } from "@/lib/stock/reservations";
import { jsonPlateIds, n, plateCodeForPurchase } from "@/lib/stock/purchases";
import { stockCostFields } from "@/lib/stock/currency";
import { notifyStockEntryCreated } from "@/lib/stockNotifications";

function serializePlate(plate: any) {
  return {
    id: plate.id,
    plateCode: plate.plateCode,
    productName: plate.productName,
    materialType: plate.materialType,
    widthCm: n(plate.widthCm),
    heightCm: n(plate.heightCm),
    totalAreaCm2: n(plate.totalAreaCm2),
    remainingAreaCm2: n(plate.remainingAreaCm2),
    purchaseCurrency: plate.purchaseCurrency,
    purchaseOriginalCost: plate.purchaseOriginalCost != null ? n(plate.purchaseOriginalCost) : n(plate.purchaseTotalCost),
    purchaseFxRate: n(plate.purchaseFxRate) || 1,
    purchaseUnitCost: n(plate.purchaseUnitCost),
    purchaseTotalCost: n(plate.purchaseTotalCost),
    status: plate.status,
    stockPurchaseId: plate.stockPurchaseId,
  };
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM "stock_purchases"
          WHERE id = ${id} AND "atolyeId" = ${auth.atolyeId}
          FOR UPDATE
        `;

        const purchase = await tx.stockPurchase.findFirst({
          where: { id, atolyeId: auth.atolyeId },
        });
        if (!purchase) {
          return { status: 404 as const, body: { error: "Satın alma kaydı bulunamadı" } };
        }

        const existingPlateIds = jsonPlateIds(purchase.createdStockPlateIds);
        if (purchase.completedAt || existingPlateIds.length > 0) {
          const plates = existingPlateIds.length
            ? await tx.stockPlate.findMany({
                where: { atolyeId: auth.atolyeId, id: { in: existingPlateIds } },
                orderBy: { plateCode: "asc" },
              })
            : [];
          return {
            status: 200 as const,
            body: {
              purchase: {
                id: purchase.id,
                purchaseCode: purchase.purchaseCode,
                status: purchase.status,
                completedAt: purchase.completedAt,
                createdStockPlateIds: existingPlateIds,
              },
              plates: plates.map(serializePlate),
              idempotent: true,
            },
          };
        }

        const currentStatus = String(purchase.status).toUpperCase();
        if (!["PLANNED", "ORDERED"].includes(currentStatus)) {
          return { status: 409 as const, body: { error: "Bu satın alma teslim alınamaz" } };
        }

        const quantity = Math.max(1, purchase.quantity);
        const widthCm = n(purchase.widthCm);
        const heightCm = n(purchase.heightCm);
        const totalAreaCm2 = widthCm * heightCm;
        const originalUnitCost = n(purchase.unitCost) > 0 ? n(purchase.unitCost) : n(purchase.totalCost) / quantity;
        const costs = stockCostFields({
          currency: purchase.currency,
          originalCost: originalUnitCost,
          fxRate: n(purchase.purchaseFxRate) || 1,
          quantity: 1,
          totalAreaCm2,
        });
        const createdPlates = [];
        const createdMovements = [];

        for (let i = 0; i < quantity; i++) {
          const plate = await tx.stockPlate.create({
            data: {
              atolyeId: auth.atolyeId,
              plateCode: plateCodeForPurchase(purchase.purchaseCode, i),
              productName: purchase.productName,
              materialType: purchase.materialType,
              supplierName: purchase.supplierName,
              warehouseId: purchase.warehouseId,
              widthCm: purchase.widthCm,
              heightCm: purchase.heightCm,
              totalAreaCm2,
              remainingAreaCm2: totalAreaCm2,
              purchaseCurrency: costs.currency,
              purchaseOriginalCost: originalUnitCost,
              purchaseFxRate: costs.fxRate,
              purchaseUnitCost: costs.purchaseUnitCost,
              purchaseTotalCost: costs.totalCostTry,
              status: "AVAILABLE",
              sourceType: "PURCHASE",
              sourceJobId: purchase.isId,
              stockPurchaseId: purchase.id,
              notes: `Satın alma teslimi: ${purchase.purchaseCode}`,
            },
          });

          const movement = await tx.stockMovement.create({
            data: {
              atolyeId: auth.atolyeId,
              stockPlateId: plate.id,
              movementType: "IN",
              quantityAreaCm2: totalAreaCm2,
              toWarehouseId: purchase.warehouseId,
              isId: purchase.isId,
              reasonCode: "PURCHASE_RECEIVED",
              note: `Satın alma teslim alındı: ${purchase.purchaseCode}`,
            },
          });

          createdPlates.push(plate);
          createdMovements.push(movement);
        }

        const plateIds = createdPlates.map((plate) => plate.id);
        const completedAt = new Date();

        const updatedPurchase = await tx.stockPurchase.update({
          where: { id: purchase.id },
          data: {
            status: "RECEIVED",
            completedAt,
            createdStockPlateIds: plateIds,
          },
        });

        if (purchase.isId) {
          const job = await tx.is.findFirst({
            where: { id: purchase.isId, atolyeId: auth.atolyeId },
            select: { id: true },
          });

          if (job) {
            const firstPlate = createdPlates[0];
            const warehouse = firstPlate?.warehouseId
              ? await tx.stockWarehouse.findFirst({
                  where: { id: firstPlate.warehouseId, atolyeId: auth.atolyeId },
                  select: { id: true, name: true },
                })
              : null;

            await tx.is.update({
              where: { id: job.id },
              data:
                quantity === 1 && firstPlate
                  ? {
                      tasDurumu: "alindi",
                      stoneSource: "STOCK",
                      selectedStockPlateId: firstPlate.id,
                      stockMaterialSnapshot: {
                        id: firstPlate.id,
                        plateCode: firstPlate.plateCode,
                        productName: firstPlate.productName,
                        materialType: firstPlate.materialType,
                        warehouseId: firstPlate.warehouseId,
                        warehouseName: warehouse?.name ?? null,
                        widthCm: n(firstPlate.widthCm),
                        heightCm: n(firstPlate.heightCm),
                        remainingAreaCm2: n(firstPlate.remainingAreaCm2),
                        purchaseTotalCost: n(firstPlate.purchaseTotalCost),
                        purchaseOriginalCost: firstPlate.purchaseOriginalCost != null ? n(firstPlate.purchaseOriginalCost) : n(firstPlate.purchaseTotalCost),
                        purchaseFxRate: n(firstPlate.purchaseFxRate) || 1,
                        purchaseCurrency: firstPlate.purchaseCurrency,
                        shadeCode: firstPlate.shadeCode,
                      },
                    }
                  : { tasDurumu: "alindi" },
            });

            if (quantity === 1 && firstPlate) {
              await ensureDraftReservationForJob(tx, {
                atolyeId: auth.atolyeId,
                isId: job.id,
                stockPlateId: firstPlate.id,
                reservedAreaCm2: n(firstPlate.remainingAreaCm2),
              });
            }
          }
        }

        return {
          status: 200 as const,
          body: {
            purchase: {
              id: updatedPurchase.id,
              purchaseCode: updatedPurchase.purchaseCode,
              status: updatedPurchase.status,
              completedAt: updatedPurchase.completedAt,
              createdStockPlateIds: plateIds,
            },
            plates: createdPlates.map(serializePlate),
            idempotent: false,
            notification: {
              productName: purchase.productName,
              purchaseId: purchase.id,
              purchaseCode: purchase.purchaseCode,
              stockPlateIds: plateIds,
              stockMovementIds: createdMovements.map((movement) => movement.id),
              quantity,
              amount: n(purchase.totalCost),
              currency: purchase.currency,
              jobId: purchase.isId,
            },
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.status === 200 && !result.body.idempotent && result.body.notification) {
      await notifyStockEntryCreated({
        atolyeId: auth.atolyeId,
        userId: auth.role === "admin" ? auth.userId : undefined,
        personelId: auth.personelId,
        refId: result.body.notification.purchaseId,
        productName: result.body.notification.productName,
        purchaseId: result.body.notification.purchaseId,
        purchaseCode: result.body.notification.purchaseCode,
        stockPlateIds: result.body.notification.stockPlateIds,
        stockMovementIds: result.body.notification.stockMovementIds,
        quantity: result.body.notification.quantity,
        amount: result.body.notification.amount,
        currency: result.body.notification.currency,
        jobId: result.body.notification.jobId,
        action: "purchase_received",
        message: `Stok girişi yapıldı: ${result.body.notification.productName}, ${result.body.notification.quantity} plaka, ${result.body.notification.amount.toLocaleString("tr-TR")} ${result.body.notification.currency}.`,
      });
    }

    const { notification: _notification, ...responseBody } = result.body;
    return NextResponse.json(responseBody, { status: result.status });
  } catch (error) {
    console.error("[stock/purchases/[id]/receive]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Bu satın alma için plaka daha önce oluşturulmuş görünüyor" }, { status: 409 });
    }
    return NextResponse.json({ error: "Satın alma teslim alınamadı" }, { status: 500 });
  }
}
