import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const VARSAYILAN_SABLONLAR: Record<string, any[]> = {
  bayi: [
    { ad: "Standart", aciklama: "Peşinat + Teslimatta", sira: 1, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },
      { taksitNo: 2, aciklama: "Teslimatta", yuzde: 70, gunSonra: 30 },
    ]},
    { ad: "Esnek", aciklama: "3 eşit taksit", sira: 2, taksitler: [
      { taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },
      { taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },
      { taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 },
    ]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [
      { taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 },
    ]},
  ],
  mimar: [
    { ad: "Standart", aciklama: "Peşinat + İmalat + Teslim", sira: 1, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 25, gunSonra: 0 },
      { taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 25, gunSonra: 15 },
      { taksitNo: 3, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 },
    ]},
    { ad: "Esnek", aciklama: "4 eşit taksit", sira: 2, taksitler: [
      { taksitNo: 1, aciklama: "1. Taksit", yuzde: 25, gunSonra: 0 },
      { taksitNo: 2, aciklama: "2. Taksit", yuzde: 25, gunSonra: 15 },
      { taksitNo: 3, aciklama: "3. Taksit", yuzde: 25, gunSonra: 30 },
      { taksitNo: 4, aciklama: "4. Taksit", yuzde: 25, gunSonra: 45 },
    ]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [
      { taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 },
    ]},
  ],
  muteahhit: [
    { ad: "Standart", aciklama: "Peşinat + İmalat + Hak Ediş", sira: 1, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 20, gunSonra: 0 },
      { taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 30, gunSonra: 15 },
      { taksitNo: 3, aciklama: "Hak Ediş", yuzde: 50, gunSonra: 45 },
    ]},
    { ad: "Esnek", aciklama: "Düşük peşinat", sira: 2, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 10, gunSonra: 0 },
      { taksitNo: 2, aciklama: "İmalat", yuzde: 40, gunSonra: 15 },
      { taksitNo: 3, aciklama: "Teslim", yuzde: 50, gunSonra: 45 },
    ]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [
      { taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 },
    ]},
  ],
  son_kullanici: [
    { ad: "Standart", aciklama: "Yarı peşin yarı teslimatta", sira: 1, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 50, gunSonra: 0 },
      { taksitNo: 2, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 },
    ]},
    { ad: "Esnek", aciklama: "3 eşit taksit", sira: 2, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 33, gunSonra: 0 },
      { taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },
      { taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 },
    ]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [
      { taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 },
    ]},
  ],
  imalatci: [
    { ad: "Standart", aciklama: "Peşinat + İş Bitiminde", sira: 1, taksitler: [
      { taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },
      { taksitNo: 2, aciklama: "İş Bitiminde", yuzde: 70, gunSonra: 30 },
    ]},
    { ad: "Esnek", aciklama: "Eşit 3 taksit", sira: 2, taksitler: [
      { taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },
      { taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },
      { taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 },
    ]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [
      { taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 },
    ]},
  ],
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    const atolyeId = auth.atolyeId;

    const { searchParams } = new URL(req.url);
    const musteriTipi = searchParams.get("musteriTipi");

    const where: any = { atolyeId };
    if (musteriTipi) where.musteriTipi = musteriTipi;

    let sablonlar = await prisma.odemeSablonu.findMany({
      where,
      orderBy: [{ musteriTipi: "asc" }, { sira: "asc" }],
    });

    // Eğer hiç şablon yoksa varsayılanları döndür (DB'ye kaydetmeden)
    if (sablonlar.length === 0) {
      const tipler = musteriTipi ? [musteriTipi] : Object.keys(VARSAYILAN_SABLONLAR);
      const varsayilan = tipler.flatMap((tip) =>
        (VARSAYILAN_SABLONLAR[tip] || []).map((s) => ({
          id: `default_${tip}_${s.sira}`,
          atolyeId,
          musteriTipi: tip,
          ad: s.ad,
          aciklama: s.aciklama,
          sira: s.sira,
          taksitler: s.taksitler,
          createdAt: new Date(),
          updatedAt: new Date(),
          varsayilan: true,
        }))
      );
      return NextResponse.json({ sablonlar: varsayilan });
    }

    return NextResponse.json({ sablonlar });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    const atolyeId = auth.atolyeId;
    const body = await req.json();

    const sablon = await prisma.odemeSablonu.create({
      data: {
        atolyeId,
        musteriTipi: body.musteriTipi,
        ad: body.ad,
        aciklama: body.aciklama || "",
        sira: body.sira || 1,
        taksitler: body.taksitler,
      },
    });
    return NextResponse.json({ sablon });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    const atolyeId = auth.atolyeId;
    const body = await req.json();

    const mevcut = await prisma.odemeSablonu.findFirst({
      where: { id: body.id, atolyeId },
    });
    if (!mevcut) return NextResponse.json({ hata: "Şablon bulunamadı." }, { status: 404 });

    const sablon = await prisma.odemeSablonu.update({
      where: { id: body.id },
      data: {
        ad: body.ad,
        aciklama: body.aciklama,
        sira: body.sira,
        taksitler: body.taksitler,
      },
    });
    return NextResponse.json({ sablon });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    const atolyeId = auth.atolyeId;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ hata: "id gerekli." }, { status: 400 });

    const mevcut = await prisma.odemeSablonu.findFirst({ where: { id, atolyeId } });
    if (!mevcut) return NextResponse.json({ hata: "Şablon bulunamadı." }, { status: 404 });

    await prisma.odemeSablonu.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
