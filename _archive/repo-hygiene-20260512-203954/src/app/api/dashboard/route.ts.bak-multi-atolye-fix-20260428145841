import { prisma } from "@/lib/prisma";
import { teklifSkoru } from "@/lib/salesScore";

function phaseLabel(phase: string) {
  const map: Record<string, string> = {
    OLCU: "Ölçü",
    TAS_ALINACAK: "Taş Alınacak",
    IMALAT: "İmalat",
    MONTAJ: "Montaj",
    TESLIM: "Teslim",
  };

  return map[phase] || phase;
}

export async function GET() {
  try {
    const isler = await prisma.is.findMany({
      orderBy: { createdAt: "desc" },
    });

    const bekleyen = isler.filter(
      i => i.durum !== "onaylandi" && i.durum !== "kaybedildi"
    );

    const onaylanan = isler.filter(i => i.durum === "onaylandi");

    const toplamCiro = onaylanan.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0),
      0
    );

    const kapanabilirTeklifler = bekleyen.map(i => {
      const ihtimal = teklifSkoru(i);

      return {
        id: i.id,
        musteri: i.musteriAdi,
        tutar: Number(i.satisFiyati || 0),
        ihtimal,
        aksiyon: ihtimal >= 65 ? "Hemen ara" : "Takip et",
      };
    });

    const bugunKapanabilirCiro = kapanabilirTeklifler
      .filter(t => t.ihtimal >= 65)
      .reduce((acc, t) => acc + t.tutar, 0);

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const yarin = new Date(bugun);
    yarin.setDate(yarin.getDate() + 1);

    const schedulePhases = await prisma.schedulePhase.findMany({
      where: {
        plannedStart: {
          gte: bugun,
          lt: yarin,
        },
      },
      orderBy: {
        plannedStart: "asc",
      },
    });

    const workScheduleIds = schedulePhases.map(p => p.workScheduleId);

    const workSchedules = await prisma.workSchedule.findMany({
      where: {
        id: {
          in: workScheduleIds,
        },
      },
    });

    const isIds = workSchedules.map(w => w.isId).filter(Boolean);

    const operasyonIsleri = await prisma.is.findMany({
      where: {
        id: {
          in: isIds,
        },
      },
    });

    const workScheduleMap = new Map(workSchedules.map(w => [w.id, w]));
    const isMap = new Map(operasyonIsleri.map(i => [i.id, i]));

    const operasyonPlan = schedulePhases.map(p => {
      const ws = workScheduleMap.get(p.workScheduleId);
      const ilgiliIs = ws ? isMap.get(ws.isId) : null;

      return {
        id: p.id,
        isId: ws?.isId || null,
        saat: p.plannedStart
          ? new Date(p.plannedStart).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--",
        tip: phaseLabel(p.phase),
        phase: p.phase,
        musteri: ilgiliIs?.musteriAdi || "Müşteri yok",
        urun: ilgiliIs?.urunAdi || "",
        durum: p.isCompleted ? "Tamamlandı" : "Bekliyor",
        tamamlandi: p.isCompleted,
      };
    });

    const toplamDakika = operasyonIsleri.reduce(
      (acc, i) => acc + Number(i.toplamSureDakika || 0),
      0
    );

    const kapasiteDakika = 720;

    const atelye = {
      doluluk: Math.round((toplamDakika / kapasiteDakika) * 100),
      bugunOperasyon: operasyonPlan.length,
      bekleyenOperasyon: operasyonPlan.filter(o => !o.tamamlandi).length,
    };

    const satisAksiyonlari = kapanabilirTeklifler
      .filter(t => t.ihtimal >= 65)
      .sort((a, b) => b.ihtimal - a.ihtimal)
      .slice(0, 3)
      .map(t => ({
        tip: "Satış",
        metin: `${t.musteri} → ${t.tutar.toLocaleString("tr-TR")}₺ (%${t.ihtimal})`,
        id: t.id,
      }));

    const operasyonAksiyonlari = operasyonPlan
      .filter(o => !o.tamamlandi)
      .slice(0, 5)
      .map(o => ({
        tip: o.tip,
        metin: `${o.saat} - ${o.musteri}${o.urun ? " / " + o.urun : ""}`,
        id: o.isId,
      }));

    return Response.json({
      toplamIs: isler.filter(i => new Date(i.createdAt) >= bugun && new Date(i.createdAt) < yarin).length,
      onaylananIs: isler.filter(i => i.durum === "onaylandi" && i.onaylanmaTarihi && new Date(i.onaylanmaTarihi) >= bugun && new Date(i.onaylanmaTarihi) < yarin).length,
      bekleyenIs: isler.filter(i => i.durum !== "onaylandi" && i.durum !== "kaybedildi" && new Date(i.createdAt) >= bugun && new Date(i.createdAt) < yarin).length,
      finans: {
        toplamCiro,
        bugunKapanabilirCiro,
      },
      kapanabilirTeklifler,
      atelye,
      operasyonPlan,
      satisAksiyonlari,
      operasyonAksiyonlari,
    });
  } catch (e:any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
