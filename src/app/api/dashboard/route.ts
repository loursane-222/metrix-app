import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

async function kullaniciAl() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const kullanici = await kullaniciAl();

    if (!kullanici) {
      return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
    }

    const atolye = await prisma.atolye.findUnique({
      where: { userId: kullanici.id },
    });

    if (!atolye) {
      return NextResponse.json({
        toplamIs: 0,
        onaylananIs: 0,
        kaybedilenIs: 0,
        bekleyenIs: 0,
        teklifVerilenTutar: 0,
        onaylananTutar: 0,
        onaylanmaOrani: 0,
        toplamCiro: 0,
        toplamMaliyet: 0,
        toplamKar: 0,
        toplamTahsilat: 0,
      });
    }

    const isler = await prisma.is.findMany({
      where: { atolyeId: atolye.id },
    });

    const toplamIs = isler.length;

    const onaylananlar = isler.filter((i) =>
      ["onaylandi", "onaylandı", "onay"].includes(
        String(i.durum || "").toLowerCase()
      )
    );

    const kaybedilenler = isler.filter((i) =>
      ["kaybedildi", "kayip", "kayıp"].includes(
        String(i.durum || "").toLowerCase()
      )
    );

    const bekleyenler = isler.filter(
      (i) =>
        !["onaylandi", "onaylandı", "onay", "kaybedildi", "kayip", "kayıp"].includes(
          String(i.durum || "").toLowerCase()
        )
    );

    const teklifVerilenTutar = isler.reduce(
      (a, i) => a + Number(i.satisFiyati || 0),
      0
    );

    const onaylananTutar = onaylananlar.reduce(
      (a, i) => a + Number(i.satisFiyati || 0),
      0
    );

    const toplamCiro = onaylananTutar;

    const toplamMaliyet = onaylananlar.reduce(
      (a, i) => a + Number(i.toplamMaliyet || 0),
      0
    );

    const toplamKar = toplamCiro - toplamMaliyet;

    const toplamTahsilat = isler.reduce(
      (a, i) => a + Number(i.tahsilat || 0),
      0
    );

    const onaylananIs = onaylananlar.length;
    const kaybedilenIs = kaybedilenler.length;
    const bekleyenIs = bekleyenler.length;

    const onaylanmaOrani =
      toplamIs > 0 ? (onaylananIs / toplamIs) * 100 : 0;

    return NextResponse.json({
      toplamIs,
      onaylananIs,
      kaybedilenIs,
      bekleyenIs,
      teklifVerilenTutar,
      onaylananTutar,
      onaylanmaOrani,
      toplamCiro,
      toplamMaliyet,
      toplamKar,
      toplamTahsilat,
    });
  } catch (err) {
    console.error("Dashboard API Hata:", err);
    return NextResponse.json(
      { hata: "Dashboard verisi alınamadı" },
      { status: 500 }
    );
  }
}
