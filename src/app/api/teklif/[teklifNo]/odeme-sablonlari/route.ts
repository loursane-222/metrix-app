import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const VARSAYILAN_SABLONLAR: Record<string, any[]> = {
  bayi: [
    { ad: "Standart", aciklama: "Peşinat + Teslimatta", sira: 1, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },{ taksitNo: 2, aciklama: "Teslimatta", yuzde: 70, gunSonra: 30 }]},
    { ad: "Esnek", aciklama: "3 eşit taksit", sira: 2, taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
  ],
  mimar: [
    { ad: "Standart", aciklama: "Peşinat + İmalat + Teslim", sira: 1, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 25, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 25, gunSonra: 15 },{ taksitNo: 3, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 }]},
    { ad: "Esnek", aciklama: "4 eşit taksit", sira: 2, taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 25, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 25, gunSonra: 15 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 25, gunSonra: 30 },{ taksitNo: 4, aciklama: "4. Taksit", yuzde: 25, gunSonra: 45 }]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
  ],
  muteahhit: [
    { ad: "Standart", aciklama: "Peşinat + İmalat + Hak Ediş", sira: 1, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 20, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 30, gunSonra: 15 },{ taksitNo: 3, aciklama: "Hak Ediş", yuzde: 50, gunSonra: 45 }]},
    { ad: "Esnek", aciklama: "Düşük peşinat", sira: 2, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 10, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat", yuzde: 40, gunSonra: 15 },{ taksitNo: 3, aciklama: "Teslim", yuzde: 50, gunSonra: 45 }]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
  ],
  son_kullanici: [
    { ad: "Standart", aciklama: "Yarı peşin yarı teslimatta", sira: 1, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 50, gunSonra: 0 },{ taksitNo: 2, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 }]},
    { ad: "Esnek", aciklama: "3 eşit taksit", sira: 2, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
  ],
  imalatci: [
    { ad: "Standart", aciklama: "Peşinat + İş Bitiminde", sira: 1, taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },{ taksitNo: 2, aciklama: "İş Bitiminde", yuzde: 70, gunSonra: 30 }]},
    { ad: "Esnek", aciklama: "Eşit 3 taksit", sira: 2, taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
    { ad: "Peşin", aciklama: "Tek seferde ödeme", sira: 3, taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
  ],
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teklifNo: string }> }
) {
  try {
    const { teklifNo } = await context.params;

    const is = await prisma.is.findFirst({
      where: { teklifNo },
      select: { atolyeId: true, musteriTipi: true },
    });
    if (!is) return NextResponse.json({ hata: "Teklif bulunamadı." }, { status: 404 });

    const musteriTipi = is.musteriTipi || "son_kullanici";

    let sablonlar = await prisma.odemeSablonu.findMany({
      where: { atolyeId: is.atolyeId, musteriTipi },
      orderBy: { sira: "asc" },
      take: 3,
    });

    if (sablonlar.length === 0) {
      const varsayilan = (VARSAYILAN_SABLONLAR[musteriTipi] || VARSAYILAN_SABLONLAR["son_kullanici"]).map((s) => ({
        id: `default_${musteriTipi}_${s.sira}`,
        musteriTipi,
        ad: s.ad,
        aciklama: s.aciklama,
        sira: s.sira,
        taksitler: s.taksitler,
      }));
      return NextResponse.json({ sablonlar: varsayilan });
    }

    return NextResponse.json({ sablonlar });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
