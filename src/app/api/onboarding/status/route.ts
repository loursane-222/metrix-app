import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeId } from "@/lib/getAtolyeId";
import { onboardingSteps, type OnboardingStepKey } from "@/lib/onboarding/registry";

export async function GET() {
  try {
    const atolyeId = await getAtolyeId();
    if (!atolyeId) {
      return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    }

    const [
      atolye,
      personelCount,
      makineCount,
      musteriCount,
      isCount,
      scheduleCount,
      tahsilatCount,
    ] = await Promise.all([
      prisma.atolye.findUnique({
        where: { id: atolyeId },
        select: {
          toplamMaas: true,
          sgkGideri: true,
          yemekGideri: true,
          yolGideri: true,
          kira: true,
          elektrik: true,
          su: true,
          dogalgaz: true,
          internet: true,
          sarfMalzeme: true,
          dakikaMaliyeti: true,
        },
      }),
      prisma.personel.count({ where: { atolyeId, aktif: true } }),
      prisma.makine.count({ where: { atolyeId } }),
      prisma.musteri.count({ where: { atolyeId } }),
      prisma.is.count({ where: { atolyeId } }),
      prisma.workSchedule.count({ where: { is: { atolyeId } } }),
      prisma.tahsilat.count({ where: { musteri: { atolyeId } } }),
    ]);

    const hasAtolyeGideri = atolye
      ? [
          atolye.toplamMaas,
          atolye.sgkGideri,
          atolye.yemekGideri,
          atolye.yolGideri,
          atolye.kira,
          atolye.elektrik,
          atolye.su,
          atolye.dogalgaz,
          atolye.internet,
          atolye.sarfMalzeme,
          atolye.dakikaMaliyeti,
        ].some((value) => Number(value || 0) > 0)
      : false;

    const steps: Record<OnboardingStepKey, boolean> = {
      personel: personelCount > 0,
      atolye_gideri: hasAtolyeGideri,
      makine_maliyeti: makineCount > 0,
      musteri: musteriCount > 0,
      ilk_teklif: isCount > 0,
      is_programi: scheduleCount > 0,
      tahsilat: tahsilatCount > 0,
    };

    const totalCount = onboardingSteps.length;
    const completedCount = onboardingSteps.filter((step) => steps[step.key]).length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return NextResponse.json({
      steps,
      completedCount,
      totalCount,
      progressPercent,
    });
  } catch (error) {
    console.error("onboarding status error:", error);
    return NextResponse.json({ hata: "Onboarding durumu alınamadı." }, { status: 500 });
  }
}
