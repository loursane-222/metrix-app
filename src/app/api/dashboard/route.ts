import { prisma } from "@/lib/prisma";
import { teklifSkoru } from "@/lib/salesScore";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

async function getAuthAtolyeId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);

    if ((payload as any).role === "personel") {
      return (payload as any).atolyeId || null;
    }

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    if (!user) return null;

    if (user.atolye?.id) return user.atolye.id;

    const atolye = await prisma.atolye.create({
      data: {
        userId: user.id,
        atolyeAdi: user.ad ? `${user.ad} Atölyesi` : "Yeni Atölye",
        email: user.email,
      },
    });

    return atolye.id;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    
    // DEBUG_BYPASS
    let atolyeId = await getAuthAtolyeId();

    if (!atolyeId) {
      // test için ilk atölyeyi al
      const first = await prisma.atolye.findFirst();
      atolyeId = first?.id || null;
    }


    if (!atolyeId) {
      return Response.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const isler = await prisma.is.findMany({
      where: { atolyeId },
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

    
    // 🔥 TEKLİF EVENT ANALİZİ
    const events = await prisma.teklifEvent.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24), // son 24 saat
        },
      },
    });

    const eventMap = {};
    for (const e of events) {
      if (!eventMap[e.teklifNo]) {
        eventMap[e.teklifNo] = {
          goruntulenme: 0,
          pdf: 0,
        };
      }

      if (e.event === "goruntulendi") {
        eventMap[e.teklifNo].goruntulenme++;
      }

      if (e.event === "pdf_acildi") {
        eventMap[e.teklifNo].pdf++;
      }
    }

    const kapanabilirTeklifler = bekleyen.map(i => {
      
      const eventData = eventMap[i.teklifNo];

      let extraScore = 0;

      if (eventData) {
        if (eventData.goruntulenme >= 2) extraScore += 10;
        if (eventData.pdf >= 1) extraScore += 20;
      }

      const ihtimal = Math.min(100, teklifSkoru(i) + extraScore);


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
        workSchedule: {
          is: {
            atolyeId,
          },
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
        is: {
          atolyeId,
        },
      },
    });

    const isIds = workSchedules.map(w => w.isId).filter(Boolean);

    const operasyonIsleri = await prisma.is.findMany({
      where: {
        atolyeId,
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
