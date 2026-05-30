import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { normalizeOffcutStatus, optionalText, serializeOffcut } from "@/lib/stock/offcuts";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const nextStatus = normalizeOffcutStatus(body?.status);
    const notes = body?.notes !== undefined ? optionalText(body.notes) : undefined;

    const offcut = await prisma.stockOffcut.findFirst({
      where: { id, atolyeId: auth.atolyeId },
      include: { parentPlate: { select: { id: true, plateCode: true, shadeCode: true } } },
    });
    if (!offcut) return NextResponse.json({ error: "Offcut bulunamadı" }, { status: 404 });

    const data: any = {};
    if (nextStatus) {
      data.status = nextStatus;
      if (nextStatus === "SCRAPPED") data.scrappedAt = new Date();
      if (nextStatus === "CONSUMED") data.consumedAt = new Date();
    }
    if (notes !== undefined) data.notes = notes;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ offcut: serializeOffcut(offcut, offcut.parentPlate) });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.stockOffcut.update({
        where: { id: offcut.id },
        data,
        include: { parentPlate: { select: { id: true, plateCode: true, shadeCode: true } } },
      });

      if (nextStatus === "SCRAPPED" && offcut.status !== "SCRAPPED") {
        await tx.stockMovement.create({
          data: {
            atolyeId: auth.atolyeId,
            offcutId: offcut.id,
            movementType: "OFFCUT_SCRAP",
            quantityAreaCm2: offcut.remainingAreaCm2,
            reasonCode: "OFFCUT_SCRAPPED",
            note: notes || `Offcut hurdaya ayrıldı: ${offcut.offcutCode}`,
          },
        });
      }

      return saved;
    });

    return NextResponse.json({ offcut: serializeOffcut(updated, updated.parentPlate) });
  } catch (error) {
    console.error("[stock/offcuts/[id]][PATCH]", error);
    return NextResponse.json({ error: "Offcut güncellenemedi" }, { status: 500 });
  }
}
