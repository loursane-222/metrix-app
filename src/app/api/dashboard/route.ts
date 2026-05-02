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
  return Response.json({ error: "Yetkisiz." }, { status: 401 });
}

    const isler = await prisma.is.findMany({
      where: { atolyeId },
      orderBy: { createdAt: "desc" },
    });

    // 🔥 ANA AKIS MAIN
const anaAkis = await prisma.activityLog.findMany({
  where: { atolyeId },
  orderBy: { createdAt: "desc" },
  take: 20
});

// 🔥 SICAK TEKLİFLER (TEK SATIŞ SKOR KAYNAĞI)
const son24Saat = new Date(Date.now() - 1000 * 60 * 60 * 24);

const teklifNolari = isler
  .map((i) => i.teklifNo)
  .filter(Boolean);

const sicakEvents = teklifNolari.length > 0
  ? await prisma.teklifEvent.findMany({
      where: {
        teklifNo: { in: teklifNolari },
        createdAt: { gte: son24Saat },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    })
  : [];

const isByTeklifNo = new Map(isler.map((i) => [i.teklifNo, i]));
const sicakMap = new Map();

for (const e of sicakEvents) {
  const ilgiliIs = isByTeklifNo.get(e.teklifNo);
  if (!ilgiliIs) continue;
  if (ilgiliIs.durum === "onaylandi" || ilgiliIs.durum === "kaybedildi") continue;

  if (!sicakMap.has(e.teklifNo)) {
    sicakMap.set(e.teklifNo, {
      id: ilgiliIs.id,
      teklifNo: e.teklifNo,
      musteri: ilgiliIs.musteriAdi || "Müşteri",
      urun: ilgiliIs.urunAdi || "",
      tutar: Number(ilgiliIs.satisFiyati || ilgiliIs.tutar || 0),
      goruntulenme: 0,
      pdf: 0,
      sonEvent: e.createdAt,
    });
  }

  const row = sicakMap.get(e.teklifNo);
  if (e.event === "goruntulendi") row.goruntulenme += 1;
  if (e.event === "pdf_acildi" || e.event === "pdf_acildi_server") row.pdf += 1;
}

const sicakTeklifler = Array.from(sicakMap.values())
  .map((t) => {
    const score = Math.min(
      100,
      (t.goruntulenme * 10) +
      (t.pdf * 12) +
      (t.goruntulenme >= 2 || t.pdf >= 2 ? 15 : 0) +
      (t.tutar >= 100000 ? 10 : t.tutar >= 50000 ? 6 : 3) +
      10
    );

    return {
      ...t,
      ihtimal: score,
    };
  })
  .sort((a, b) => b.ihtimal - a.ihtimal)
  .slice(0, 8);

// ----

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
        aksiyon: ihtimal >= 65 ? "WhatsApp mesajı" : "WhatsApp takip",
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

    const satisAksiyonlari = [];

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
      kapanabilirTeklifler: [],
      sicakTeklifler: sicakTeklifler || [],
      anaAkis,
      atelye,
      operasyonPlan,
      satisAksiyonlari,
            operasyonAksiyonlari,
    });
  } catch (e:any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
