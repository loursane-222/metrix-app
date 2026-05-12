import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";


function odemePlanOlustur(musteriTipi: string, toplamTutar: number, onayTarihi: Date) {
  const taksitler: { taksitNo: number; aciklama: string; yuzdesi: number; gunSonra: number }[] = [];
  if (musteriTipi === "bayi") {
    taksitler.push({ taksitNo: 1, aciklama: "Pessinat (%30)", yuzdesi: 30, gunSonra: 0 });
    taksitler.push({ taksitNo: 2, aciklama: "Teslimatta (%70)", yuzdesi: 70, gunSonra: 30 });
  } else if (musteriTipi === "mimar") {
    taksitler.push({ taksitNo: 1, aciklama: "Pessinat (%25)", yuzdesi: 25, gunSonra: 0 });
    taksitler.push({ taksitNo: 2, aciklama: "Imalat baslangici (%25)", yuzdesi: 25, gunSonra: 15 });
    taksitler.push({ taksitNo: 3, aciklama: "Teslimatta (%50)", yuzdesi: 50, gunSonra: 30 });
  } else if (musteriTipi === "muteahhit") {
    taksitler.push({ taksitNo: 1, aciklama: "Pessinat (%20)", yuzdesi: 20, gunSonra: 0 });
    taksitler.push({ taksitNo: 2, aciklama: "Imalat baslangici (%30)", yuzdesi: 30, gunSonra: 15 });
    taksitler.push({ taksitNo: 3, aciklama: "Teslim + 30 gun (%50)", yuzdesi: 50, gunSonra: 45 });
  } else {
    taksitler.push({ taksitNo: 1, aciklama: "Pessinat (%50)", yuzdesi: 50, gunSonra: 0 });
    taksitler.push({ taksitNo: 2, aciklama: "Teslimatta (%50)", yuzdesi: 50, gunSonra: 30 });
  }
  return taksitler.map((t) => ({
    taksitNo: t.taksitNo,
    aciklama: t.aciklama,
    tutar: Math.round((toplamTutar * t.yuzdesi) / 100 * 100) / 100,
    vadeTarihi: new Date(onayTarihi.getTime() + t.gunSonra * 24 * 60 * 60 * 1000),
  }));
}

export async function POST(req: Request) {
  try {
    const auth = await getAtolyeAuth(); if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 }); const atolyeId = auth.atolyeId;
    const { id, durum, fiyat, tasDurumu, sablonId } = await req.json();
    if (!id) return Response.json({ error: "ID gerekli" }, { status: 400 });

    const data: any = { durum };
    if (fiyat !== undefined) data.satisFiyati = String(fiyat || 0);
    if (tasDurumu !== undefined) data.tasDurumu = tasDurumu || null;
    if (durum === "onaylandi") { data.onaylanmaTarihi = new Date(); data.kaybedilmeTarihi = null; }
    if (durum === "kaybedildi") { data.kaybedilmeTarihi = new Date(); data.onaylanmaTarihi = null; }
    if (durum === "teklif_verildi") { data.onaylanmaTarihi = null; data.kaybedilmeTarihi = null; }

    const updated = await prisma.is.update({ where: { id }, data, include: { musteri: true } });

    if (atolyeId) {
      const tutar = Number(fiyat || updated.satisFiyati || 0);
      const musteriAdi = updated.musteriAdi || updated.musteri?.firmaAdi || "Musteri";
      const teklifNo = updated.teklifNo || "";
      if (durum === "onaylandi") {
        await logActivity({ atolyeId, type: "teklif_onaylandi", message: musteriAdi + " – " + teklifNo + " teklifi onaylandi. Tutar: " + tutar.toLocaleString("tr-TR") + " TL", refId: id });
      } else if (durum === "kaybedildi") {
        await logActivity({ atolyeId, type: "teklif_kaybedildi", message: musteriAdi + " – " + teklifNo + " teklifi kaybedildi.", refId: id });
      } else if (durum === "teklif_verildi") {
        await logActivity({ atolyeId, type: "teklif_guncellendi", message: musteriAdi + " – " + teklifNo + " durumu teklif verildi olarak guncellendi.", refId: id });
      }
    }

    if (durum === "onaylandi" && updated.musteriId && updated.musteri) {
      const mevcutPlan = await prisma.odemePlani.findUnique({ where: { isId: id } });
      if (!mevcutPlan) {
        const musteriTipi = updated.musteri.musteriTipi || "son_kullanici";
        const toplamTutar = Number(fiyat || updated.satisFiyati || 0);
        if (toplamTutar > 0) {
          const onayTarihi = new Date();
          let taksitVerileri: any[];
          if (sablonId && !sablonId.startsWith('default_')) {
            const sablon = await prisma.odemeSablonu.findUnique({ where: { id: sablonId } });
            if (sablon) {
              const taksitler = sablon.taksitler as { taksitNo: number; aciklama: string; yuzde: number; gunSonra: number }[];
              taksitVerileri = taksitler.map(t => ({
                taksitNo: t.taksitNo,
                aciklama: t.aciklama,
                tutar: Math.round((toplamTutar * t.yuzde) / 100 * 100) / 100,
                vadeTarihi: new Date(onayTarihi.getTime() + t.gunSonra * 24 * 60 * 60 * 1000),
              }));
            } else {
              taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, onayTarihi);
            }
          } else if (sablonId && sablonId.startsWith('default_')) {
            const VARSAYILAN: Record<string, any[]> = {
              bayi: [{taksitNo:1,aciklama:"Peşinat",yuzde:30,gunSonra:0},{taksitNo:2,aciklama:"Teslimatta",yuzde:70,gunSonra:30}],
              mimar: [{taksitNo:1,aciklama:"Peşinat",yuzde:25,gunSonra:0},{taksitNo:2,aciklama:"İmalat Başlangıcı",yuzde:25,gunSonra:15},{taksitNo:3,aciklama:"Teslimatta",yuzde:50,gunSonra:30}],
              muteahhit: [{taksitNo:1,aciklama:"Peşinat",yuzde:20,gunSonra:0},{taksitNo:2,aciklama:"İmalat Başlangıcı",yuzde:30,gunSonra:15},{taksitNo:3,aciklama:"Hak Ediş",yuzde:50,gunSonra:45}],
              son_kullanici: [{taksitNo:1,aciklama:"Peşinat",yuzde:50,gunSonra:0},{taksitNo:2,aciklama:"Teslimatta",yuzde:50,gunSonra:30}],
              imalatci: [{taksitNo:1,aciklama:"Peşinat",yuzde:30,gunSonra:0},{taksitNo:2,aciklama:"İş Bitiminde",yuzde:70,gunSonra:30}],
            };
            const parts = sablonId.replace('default_','').split('_');
            const sira = parseInt(parts[parts.length-1]) - 1;
            const tip = parts.slice(0, parts.length-1).join('_');
            const grup = VARSAYILAN[tip] || VARSAYILAN['son_kullanici'];
            // default_ id'si tek taksit listesi, sira yerine tüm grubu kullan
            taksitVerileri = grup.map((t: any) => ({
              taksitNo: t.taksitNo, aciklama: t.aciklama,
              tutar: Math.round((toplamTutar * t.yuzde) / 100 * 100) / 100,
              vadeTarihi: new Date(onayTarihi.getTime() + t.gunSonra * 24 * 60 * 60 * 1000),
            }));
          } else {
            taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, onayTarihi);
          }
          await prisma.odemePlani.create({
            data: { isId: id, musteriId: updated.musteriId, toplamTutar, musteriTipi, taksitler: { create: taksitVerileri } },
          });
        }
      }
    }

    return Response.json({ ok: true, data: updated });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
