import { prisma } from "@/lib/prisma";
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
    const atolyeId = await getAuthAtolyeId();
    if (!atolyeId) {
      return Response.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const simdi = new Date();
    const bugunBaslangic = new Date(simdi);
    bugunBaslangic.setHours(0, 0, 0, 0);
    const yarin = new Date(bugunBaslangic);
    yarin.setDate(yarin.getDate() + 1);

    const yilBaslangic = new Date(simdi.getFullYear(), 0, 1);
    const ayBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1);

    // Tüm işler
    const isler = await prisma.is.findMany({
      where: { atolyeId },
      orderBy: { createdAt: "desc" },
      include: { musteri: true },
    });

    // --- FİNANS: Yıllık ---
    const yillikOnaylanan = isler.filter(
      (i) =>
        i.durum === "onaylandi" &&
        i.onaylanmaTarihi &&
        new Date(i.onaylanmaTarihi) >= yilBaslangic
    );
    const yillikKaybedilen = isler.filter(
      (i) =>
        i.durum === "kaybedildi" &&
        i.kaybedilmeTarihi &&
        new Date(i.kaybedilmeTarihi) >= yilBaslangic
    );
    const yillikDevamEden = isler.filter(
      (i) => i.durum !== "onaylandi" && i.durum !== "kaybedildi"
    );
    const yillikTumTeklifler = isler.filter(
      (i) => new Date(i.createdAt) >= yilBaslangic
    );

    const yillikVerilen = yillikTumTeklifler.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const yillikOnaylananTutar = yillikOnaylanan.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const yillikKaybedilenTutar = yillikKaybedilen.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const yillikDevamTutar = yillikDevamEden.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const yillikToplam = yillikOnaylananTutar + yillikKaybedilenTutar + yillikDevamTutar;
    const yillikDonusumOrani =
      yillikToplam > 0 ? Math.round((yillikOnaylananTutar / yillikToplam) * 100) : 0;

    // --- FİNANS: Aylık ---
    const aylikOnaylanan = isler.filter(
      (i) =>
        i.durum === "onaylandi" &&
        i.onaylanmaTarihi &&
        new Date(i.onaylanmaTarihi) >= ayBaslangic
    );
    const aylikKaybedilen = isler.filter(
      (i) =>
        i.durum === "kaybedildi" &&
        i.kaybedilmeTarihi &&
        new Date(i.kaybedilmeTarihi) >= ayBaslangic
    );
    const aylikDevamEden = isler.filter(
      (i) =>
        i.durum !== "onaylandi" &&
        i.durum !== "kaybedildi" &&
        new Date(i.createdAt) >= ayBaslangic
    );
    const aylikTumTeklifler = isler.filter(
      (i) => new Date(i.createdAt) >= ayBaslangic
    );

    const aylikVerilen = aylikTumTeklifler.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const aylikOnaylananTutar = aylikOnaylanan.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const aylikKaybedilenTutar = aylikKaybedilen.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const aylikDevamTutar = aylikDevamEden.reduce(
      (acc, i) => acc + Number(i.satisFiyati || 0), 0
    );
    const aylikToplam = aylikOnaylananTutar + aylikKaybedilenTutar + aylikDevamTutar;
    const aylikDonusumOrani =
      aylikToplam > 0 ? Math.round((aylikOnaylananTutar / aylikToplam) * 100) : 0;

    // --- SICAK TEKLİFLER ---
    const son7Gun = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const teklifNolari = isler.map((i) => i.teklifNo).filter(Boolean);
    const sicakEvents =
      teklifNolari.length > 0
        ? await prisma.teklifEvent.findMany({
            where: {
              teklifNo: { in: teklifNolari },
              createdAt: { gte: son7Gun },
            },
            orderBy: { createdAt: "desc" },
            take: 300,
          })
        : [];

    const isByTeklifNo = new Map(isler.map((i) => [i.teklifNo, i]));
    const sicakMap = new Map<string, any>();

    for (const e of sicakEvents) {
      const ilgiliIs = isByTeklifNo.get(e.teklifNo);
      if (!ilgiliIs) continue;
      if (ilgiliIs.durum === "onaylandi" || ilgiliIs.durum === "kaybedildi") continue;
      if (!sicakMap.has(e.teklifNo)) {
        sicakMap.set(e.teklifNo, {
          id: ilgiliIs.id,
          teklifNo: e.teklifNo,
          musteri: ilgiliIs.musteriAdi || ilgiliIs.musteri?.firmaAdi || ilgiliIs.musteri?.ad || "Müşteri",
          telefon: ilgiliIs.musteri?.telefon || "",
          urun: ilgiliIs.urunAdi || "",
          tutar: Number(ilgiliIs.satisFiyati || 0),
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
          t.goruntulenme * 10 +
            t.pdf * 12 +
            (t.goruntulenme >= 2 || t.pdf >= 2 ? 15 : 0) +
            (t.tutar >= 100000 ? 10 : t.tutar >= 50000 ? 6 : 3) +
            10
        );
        const saatFarki = (Date.now() - new Date(t.sonEvent).getTime()) / (1000 * 60 * 60);
        let aksiyonTipi = "";
        let aksiyonMesaji = "";
        if (t.goruntulenme === 0 && saatFarki > 24) {
          aksiyonTipi = "whatsapp";
          aksiyonMesaji = "Teklifinizi inceleme fırsatınız oldu mu?";
        } else if (t.goruntulenme > 0 && t.pdf === 0 && saatFarki > 12) {
          aksiyonTipi = "ara";
          aksiyonMesaji = "Müşteri baktı ama ilerlemedi.";
        } else if (t.pdf > 0 && saatFarki > 6) {
          aksiyonTipi = "satis";
          aksiyonMesaji = "Kararsız. Kapanış yap.";
        } else if (saatFarki > 72) {
          aksiyonTipi = "risk";
          aksiyonMesaji = "Bu iş kaybediliyor.";
        }
        return {
          ...t,
          ihtimal: score,
          aksiyonTipi,
          aksiyonMesaji,
          aksiyonSaati: Math.round(saatFarki),
        };
      })
      .sort((a, b) => b.ihtimal - a.ihtimal)
      .slice(0, 8);

    // --- CANLI AKİŞ ---
    // Son 5 is gunu (hafta sonu haric, en fazla 7 takvim gunu geriye git)
    const simdi5IsGunu = new Date()
    simdi5IsGunu.setDate(simdi5IsGunu.getDate() - 7)

    const anaAkisRaw = await prisma.activityLog.findMany({
      where: {
        atolyeId,
        createdAt: { gte: simdi5IsGunu },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // ActivityLog.personelId FK var ama @relation yok — ayrı lookup
    const personelIds = [
      ...new Set(anaAkisRaw.map((a) => a.personelId).filter(Boolean)),
    ] as string[];
    const personelMap: Record<string, string> =
      personelIds.length > 0
        ? Object.fromEntries(
            (
              await prisma.personel.findMany({
                where: { id: { in: personelIds } },
                select: { id: true, ad: true },
              })
            ).map((p) => [p.id, p.ad])
          )
        : {};
    // userId → User.ad (admin girişleri için fallback)
    const userIds = [
      ...new Set(anaAkisRaw.map((a) => a.userId).filter(Boolean)),
    ] as string[];
    const userMap: Record<string, string> =
      userIds.length > 0
        ? Object.fromEntries(
            (
              await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, ad: true },
              })
            ).map((u) => [u.id, u.ad || ""])
          )
        : {};

    const anaAkis = anaAkisRaw.map((a) => ({
      ...a,
      actorAdi:
        (a.personelId ? personelMap[a.personelId] : null) ??
        (a.userId ? (userMap[a.userId] || null) : null) ??
        null,
    }));

    // --- BUGÜNÜN PLANI ---
    const schedulePhases = await prisma.schedulePhase.findMany({
      where: {
        plannedStart: { gte: bugunBaslangic, lt: yarin },
        workSchedule: { is: { atolyeId } },
      },
      orderBy: { plannedStart: "asc" },
    });

    const workScheduleIds = schedulePhases.map((p) => p.workScheduleId);
    const workSchedules =
      workScheduleIds.length > 0
        ? await prisma.workSchedule.findMany({
            where: { id: { in: workScheduleIds }, is: { atolyeId } },
          })
        : [];

    const isIds = workSchedules.map((w) => w.isId).filter(Boolean);
    const operasyonIsleri =
      isIds.length > 0
        ? await prisma.is.findMany({
            where: { atolyeId, id: { in: isIds } },
          })
        : [];

    const workScheduleMap = new Map(workSchedules.map((w) => [w.id, w]));
    const isMap = new Map(operasyonIsleri.map((i) => [i.id, i]));

    // --- OPERASYON KPI ---
    const phaseIds = schedulePhases.map((p) => p.id);
    const phaseExecutions =
      phaseIds.length > 0
        ? await prisma.phaseExecution.findMany({
            where: { schedulePhaseId: { in: phaseIds }, atolyeId },
            select: { schedulePhaseId: true, status: true },
          })
        : [];

    // Aynı faz için birden fazla execution olabilir (önceki CANCELLED + yeni STARTED).
    // Öncelik sırasına göre en aktif olanı tut.
    const execPriority: Record<string, number> = {
      STARTED: 5, PAUSED: 4, CANNOT_START: 3, PLANNED: 2, COMPLETED: 1, CANCELLED: 0,
    };
    const execStatusMap = new Map<string, string>();
    for (const ex of phaseExecutions) {
      const prev = execStatusMap.get(ex.schedulePhaseId);
      if (!prev || (execPriority[ex.status] ?? 0) > (execPriority[prev] ?? 0)) {
        execStatusMap.set(ex.schedulePhaseId, ex.status);
      }
    }

    const kpiTamamlanan = schedulePhases.filter((p) => p.isCompleted).length;
    const kpiIslemde = schedulePhases.filter((p) => {
      if (p.isCompleted) return false;
      const s = execStatusMap.get(p.id);
      return s === "STARTED" || s === "PAUSED";
    }).length;
    const kpiGeciken = schedulePhases.filter((p) => {
      if (p.isCompleted) return false;
      const s = execStatusMap.get(p.id);
      if (s === "COMPLETED" || s === "CANCELLED") return false;
      return p.plannedEnd != null && new Date(p.plannedEnd) < simdi;
    }).length;
    const kpiPlanlanan = Math.max(0, schedulePhases.length - kpiTamamlanan - kpiIslemde - kpiGeciken);

    const operasyonKpi = {
      planlanan: kpiPlanlanan,
      islemde: kpiIslemde,
      tamamlanan: kpiTamamlanan,
      geciken: kpiGeciken,
    };

    const operasyonPlan = schedulePhases.map((p) => {
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
        tamamlandi: p.isCompleted,
      };
    });

    // --- VADESİ GELEN TAHSİLATLAR ---
    const vadesiGelenTaksitler = await prisma.odemeTaksiti.findMany({
      where: {
        odendiMi: false,
        vadeTarihi: { lte: yarin },
        plan: { musteri: { atolyeId } },
      },
      include: {
        plan: {
          include: { musteri: true, is: true },
        },
      },
      orderBy: { vadeTarihi: "asc" },
      take: 10,
    });

    const vadesiGelenler = vadesiGelenTaksitler.map((t) => {
      const gecenGun = Math.floor(
        (simdi.getTime() - new Date(t.vadeTarihi).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: t.id,
        musteriAdi:
          t.plan.musteri?.firmaAdi ||
          `${t.plan.musteri?.ad || ""} ${t.plan.musteri?.soyad || ""}`.trim() ||
          "Müşteri",
        musteriTelefon: t.plan.musteri?.telefon || "",
        vadeTarihi: t.vadeTarihi.toISOString(),
        tutar: Number(t.tutar),
        gecenGun,
        durum: gecenGun > 0 ? "gecmis" : "bugun",
        aciklama: t.aciklama || "",
        teklifNo: t.plan.is?.teklifNo || "",
        musteriId: t.plan.musteri?.id || "",
      };
    });

    // --- ATOLYE DOLULUK ---
    const toplamDakika = operasyonIsleri.reduce(
      (acc, i) => acc + Number(i.toplamSureDakika || 0), 0
    );
    const kapasiteDakika = 720;
    const atelye = {
      doluluk: toplamDakika > 0 ? Math.round((toplamDakika / kapasiteDakika) * 100) : 0,
      bugunOperasyon: operasyonPlan.length,
      bekleyenOperasyon: operasyonPlan.filter((o) => !o.tamamlandi).length,
    };

    return Response.json({
      // Sayaçlar (sidebar için)
      toplamIs: isler.filter(
        (i) => new Date(i.createdAt) >= bugunBaslangic && new Date(i.createdAt) < yarin
      ).length,
      onaylananIs: isler.filter(
        (i) =>
          i.durum === "onaylandi" &&
          i.onaylanmaTarihi &&
          new Date(i.onaylanmaTarihi) >= bugunBaslangic &&
          new Date(i.onaylanmaTarihi) < yarin
      ).length,
      bekleyenIs: isler.filter(
        (i) =>
          i.durum !== "onaylandi" &&
          i.durum !== "kaybedildi" &&
          new Date(i.createdAt) >= bugunBaslangic &&
          new Date(i.createdAt) < yarin
      ).length,
      // Finans
      finans: {
        yillik: {
          verilen: yillikVerilen,
          onaylanan: yillikOnaylananTutar,
          kaybedilen: yillikKaybedilenTutar,
          devam: yillikDevamTutar,
          donusumOrani: yillikDonusumOrani,
          teklifSayisi: yillikTumTeklifler.length,
        },
        aylik: {
          verilen: aylikVerilen,
          onaylanan: aylikOnaylananTutar,
          kaybedilen: aylikKaybedilenTutar,
          devam: aylikDevamTutar,
          donusumOrani: aylikDonusumOrani,
          teklifSayisi: aylikTumTeklifler.length,
        },
      },
      sicakTeklifler,
      anaAkis,
      operasyonPlan,
      operasyonKpi,
      vadesiGelenler,
      atelye,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
