import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth();
  if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
  const atolyeId = auth.atolyeId;

  const body = await req.json();
  const musteri = await prisma.musteri.findFirst({ where: { id: body.musteriId, atolyeId } });
  if (!musteri) return NextResponse.json({ hata: "Musteri bulunamadi." }, { status: 404 });

  if (body.isId) {
    const is = await prisma.is.findFirst({ where: { id: body.isId, musteriId: musteri.id, atolyeId } });
    if (!is) return NextResponse.json({ hata: "Is bulunamadi." }, { status: 404 });
  }

  const tahsilat = await prisma.tahsilat.create({
    data: {
      musteriId: musteri.id,
      isId: body.isId || null,
      tarih: body.tarih ? new Date(body.tarih) : new Date(),
      tutar: Number(body.tutar || 0),
    },
  });

  const musteriAdi = musteri.firmaAdi || (musteri.ad + " " + musteri.soyad).trim() || "Musteri";
  await logActivity({
    atolyeId,
    type: "tahsilat_yapildi",
    message: musteriAdi + " – " + Number(body.tutar || 0).toLocaleString("tr-TR") + " TL tahsilat yapildi.",
    refId: tahsilat.id,
    userId: auth.userId,
  });

  return NextResponse.json({ tahsilat });
}

export async function GET(req: NextRequest) {
  const auth = await getAtolyeAuth();
  if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
  const atolyeId = auth.atolyeId;

  const { searchParams } = new URL(req.url);
  const musteriId = searchParams.get("musteriId");
  const isId = searchParams.get("isId");

  const tahsilatlar = await prisma.tahsilat.findMany({
    where: {
      musteri: { atolyeId },
      ...(musteriId ? { musteriId } : {}),
      ...(isId ? { isId } : {}),
    },
    include: {
      is: { select: { id: true, teklifNo: true, urunAdi: true, satisFiyati: true } },
    },
    orderBy: { tarih: "desc" },
  });

  return NextResponse.json({ tahsilatlar });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth();
  if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
  const atolyeId = auth.atolyeId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ hata: "id gerekli." }, { status: 400 });

  const tahsilat = await prisma.tahsilat.findFirst({ where: { id, musteri: { atolyeId } } });
  if (!tahsilat) return NextResponse.json({ hata: "Tahsilat bulunamadi." }, { status: 404 });

  await prisma.tahsilat.delete({ where: { id } });
  return NextResponse.json({ basarili: true });
}
