import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { notifyProposalApproved } from "@/lib/proposalNotifications";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teklifNo: string }> }
) {
  try {
    const { teklifNo } = await context.params;
    const body = await req.json().catch(() => ({}));
    const sablonId: string | undefined = body.sablonId;

    const is = await prisma.is.findFirst({
      where: { teklifNo },
      select: {
        id: true,
        atolyeId: true,
        musteriId: true,
        musteriAdi: true,
        teklifNo: true,
        durum: true,
        kdvDahilFiyat: true,
        satisFiyati: true,
        musteriTipi: true,
      },
    });

    if (!is) return NextResponse.json({ redirect: `/teklif/${teklifNo}?hata=bulunamadi` });
    const shouldNotifyApproval = is.durum !== "onaylandi";

    await prisma.is.update({
      where: { id: is.id },
      data: { durum: "onaylandi", onaylanmaTarihi: new Date(), whatsappOnay: true, whatsappOnayOkundu: false },
    });

    if (sablonId && is.musteriId && !sablonId.startsWith("default_")) {
      const sablon = await prisma.odemeSablonu.findUnique({ where: { id: sablonId } });
      if (sablon) await _odemePlaniOlustur(is, sablon);
    } else if (sablonId && sablonId.startsWith("default_")) {
      await _varsayilanPlanOlustur(is, sablonId);
    }

    if (shouldNotifyApproval) {
      await notifyProposalApproved({
        job: is,
        source: "public-proposal",
      });
    }

    return NextResponse.json({ redirect: `/teklif/${teklifNo}/tesekkur` });
  } catch (e) {
    console.error("ONLINE TEKLIF ONAY HATASI:", e);
    return NextResponse.json({ redirect: `/teklif/hata` });
  }
}

async function _odemePlaniOlustur(is: any, sablon: any) {
  const toplamTutar = Number(is.kdvDahilFiyat || is.satisFiyati || 0);
  const taksitler = sablon.taksitler as { taksitNo: number; aciklama: string; yuzde: number; gunSonra: number }[];
  const bugun = new Date();

  const mevcutPlan = await prisma.odemePlani.findUnique({ where: { isId: is.id } });
  if (mevcutPlan) return;

  await prisma.odemePlani.create({
    data: {
      isId: is.id,
      musteriId: is.musteriId,
      toplamTutar,
      musteriTipi: is.musteriTipi || sablon.musteriTipi,
      taksitler: {
        create: taksitler.map((t) => {
          const vade = new Date(bugun);
          vade.setDate(vade.getDate() + t.gunSonra);
          return { taksitNo: t.taksitNo, aciklama: t.aciklama, vadeTarihi: vade, tutar: (toplamTutar * t.yuzde) / 100 };
        }),
      },
    },
  });
}

async function _varsayilanPlanOlustur(is: any, sablonId: string) {
  // default_musteritipi_sira formatından taksitleri yeniden inşa et
  const VARSAYILAN: Record<string, any[]> = {
    bayi: [
      { ad: "Standart", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },{ taksitNo: 2, aciklama: "Teslimatta", yuzde: 70, gunSonra: 30 }]},
      { ad: "Esnek", taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
      { ad: "Peşin", taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
    ],
    mimar: [
      { ad: "Standart", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 25, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 25, gunSonra: 15 },{ taksitNo: 3, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 }]},
      { ad: "Esnek", taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 25, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 25, gunSonra: 15 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 25, gunSonra: 30 },{ taksitNo: 4, aciklama: "4. Taksit", yuzde: 25, gunSonra: 45 }]},
      { ad: "Peşin", taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
    ],
    muteahhit: [
      { ad: "Standart", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 20, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat Başlangıcı", yuzde: 30, gunSonra: 15 },{ taksitNo: 3, aciklama: "Hak Ediş", yuzde: 50, gunSonra: 45 }]},
      { ad: "Esnek", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 10, gunSonra: 0 },{ taksitNo: 2, aciklama: "İmalat", yuzde: 40, gunSonra: 15 },{ taksitNo: 3, aciklama: "Teslim", yuzde: 50, gunSonra: 45 }]},
      { ad: "Peşin", taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
    ],
    son_kullanici: [
      { ad: "Standart", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 50, gunSonra: 0 },{ taksitNo: 2, aciklama: "Teslimatta", yuzde: 50, gunSonra: 30 }]},
      { ad: "Esnek", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
      { ad: "Peşin", taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
    ],
    imalatci: [
      { ad: "Standart", taksitler: [{ taksitNo: 1, aciklama: "Peşinat", yuzde: 30, gunSonra: 0 },{ taksitNo: 2, aciklama: "İş Bitiminde", yuzde: 70, gunSonra: 30 }]},
      { ad: "Esnek", taksitler: [{ taksitNo: 1, aciklama: "1. Taksit", yuzde: 33, gunSonra: 0 },{ taksitNo: 2, aciklama: "2. Taksit", yuzde: 33, gunSonra: 30 },{ taksitNo: 3, aciklama: "3. Taksit", yuzde: 34, gunSonra: 60 }]},
      { ad: "Peşin", taksitler: [{ taksitNo: 1, aciklama: "Peşin Ödeme", yuzde: 100, gunSonra: 0 }]},
    ],
  };

  const parts = sablonId.replace("default_", "").split("_");
  const sira = parseInt(parts[parts.length - 1]) - 1;
  const tip = parts.slice(0, parts.length - 1).join("_");
  const sablon = (VARSAYILAN[tip] || VARSAYILAN["son_kullanici"])[sira];
  if (!sablon || !is.musteriId) return;

  const mevcutPlan = await prisma.odemePlani.findUnique({ where: { isId: is.id } });
  if (mevcutPlan) return;

  const toplamTutar = Number(is.kdvDahilFiyat || is.satisFiyati || 0);
  const bugun = new Date();
  await prisma.odemePlani.create({
    data: {
      isId: is.id,
      musteriId: is.musteriId,
      toplamTutar,
      musteriTipi: is.musteriTipi || tip,
      taksitler: {
        create: sablon.taksitler.map((t: any) => {
          const vade = new Date(bugun);
          vade.setDate(vade.getDate() + t.gunSonra);
          return { taksitNo: t.taksitNo, aciklama: t.aciklama, vadeTarihi: vade, tutar: (toplamTutar * t.yuzde) / 100 };
        }),
      },
    },
  });
}
