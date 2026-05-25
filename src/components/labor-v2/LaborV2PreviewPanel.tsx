"use client";

import { useEffect, useMemo } from "react";
import { calculateLaborV2, normalizeLaborV2Input } from "@/lib/labor-v2";
import { LABOR_V2_CUTOUT_DEFAULT_MINUTES } from "@/lib/labor-v2";
import type { LaborV2Input, LaborV2OperationInput } from "@/lib/labor-v2";
import { LaborV2DebugPanel } from "./LaborV2DebugPanel";

function n(value: unknown): number {
  const parsed = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parcaMtul(parca: { en?: unknown; boy?: unknown; adet?: unknown }): number {
  const en = n(parca.en);
  const boy = n(parca.boy);
  const adet = n(parca.adet) || 1;
  return en > 0 && boy > 0 ? (boy / 100) * adet : 0;
}

function useLaborV2Result({
  form,
  hesap,
  makineler,
  plakaFireOrani,
}: {
  form: any;
  hesap: any;
  makineler: any[];
  plakaFireOrani: number;
}) {
  const laborV2Input = useMemo<LaborV2Input>(() => {
    const makineMaliyet = (id: string): number | undefined => {
      const makine = makineler.find((item: any) => item.id === id);
      const value = Number(
        makine?.dakikalikMaliyet ??
        makine?.dkMaliyet ??
        makine?.dakikaMaliyet ??
        makine?.hesaplananDakikaMaliyeti ??
        0
      );
      return Number.isFinite(value) && value > 0 ? value : undefined;
    };
    const operations: LaborV2OperationInput[] = [];

    (form.parcalar || []).forEach((parca: any) => {
      const mtul = parcaMtul(parca);
      const dakika = n(form.tezgahDakika || "25");
      if (mtul <= 0 || dakika <= 0) return;
      operations.push({
        key: `parca_${parca.id}`,
        label: parca.ad || "Parça",
        category: "FABRICATION_BASE",
        totalMinutes: mtul * dakika,
        minuteCost: makineMaliyet(form.tezgahMakineId),
        machineId: form.tezgahMakineId || undefined,
        shapeType: parca.sekilTipi || "dikdortgen",
        source: "yeni-is-v3.parcalar",
      });
    });

    if (hesap.effectivePahlamaMtul > 0 && n(form.pahlamaDakika) > 0) {
      operations.push({
        key: "pahlama",
        label: "Pahlama",
        category: "EDGE",
        totalMinutes: hesap.effectivePahlamaMtul * n(form.pahlamaDakika),
        minuteCost: makineMaliyet(form.pahlamaMakineId),
        machineId: form.pahlamaMakineId || undefined,
        source: "yeni-is-v3.operasyon",
      });
    }

    if (hesap.effectiveKesim45Mtul > 0 && n(form.kesim45Dakika) > 0) {
      operations.push({
        key: "kesim_45",
        label: "45° Kesim",
        category: "CUT_45",
        totalMinutes: hesap.effectiveKesim45Mtul * n(form.kesim45Dakika),
        minuteCost: makineMaliyet(form.kesim45MakineId),
        machineId: form.kesim45MakineId || undefined,
        source: "yeni-is-v3.operasyon",
      });
    }

    [
      { key: "eviye", label: "Eviye", count: n(form.eviyes), minutes: LABOR_V2_CUTOUT_DEFAULT_MINUTES.eviye },
      { key: "ocak", label: "Ocak", count: n(form.ocaklar), minutes: LABOR_V2_CUTOUT_DEFAULT_MINUTES.ocak },
      { key: "priz", label: "Priz/Delik", count: n(form.prizler), minutes: LABOR_V2_CUTOUT_DEFAULT_MINUTES.priz },
    ].forEach((item) => {
      if (item.count <= 0) return;
      operations.push({
        key: item.key,
        label: `${item.label} (${item.count} ad)`,
        category: "CUTOUT",
        totalMinutes: item.count * item.minutes,
        minuteCost: makineMaliyet(form.tezgahMakineId),
        machineId: form.tezgahMakineId || undefined,
        source: "yeni-is-v3.ek-is",
      });
    });

    return normalizeLaborV2Input({
      project: {
        totalMtul: hesap.toplamMtul,
        totalAreaCm2: hesap.toplamParcaAlani,
        pieceCount: (form.parcalar || []).length,
        hasDamarTakibi: Boolean(form.plakaLayoutJson?.damarTakibi || form.plakaLayoutJson?.hasDamarTakibi),
        hasBookmatch: Boolean(form.plakaLayoutJson?.bookmatch || form.plakaLayoutJson?.hasBookmatch),
        layoutFireRate: n(form.plakaLayoutJson?.fireOrani || plakaFireOrani),
        projectDifficulty: ["u", "ozel"].includes(form.mutfakTipi) ? "HIGH" : "NORMAL",
      },
      economics: {
        shopMinuteCost: makineMaliyet(form.tezgahMakineId),
        defaultMachineMinuteCost: makineMaliyet(form.tezgahMakineId),
      },
      operations,
      metadata: {
        source: "yeni-is-v3-desktop-preview",
        authoritative: false,
      },
    });
  }, [form, hesap, makineler, plakaFireOrani]);

  return useMemo(() => calculateLaborV2(laborV2Input), [laborV2Input]);
}

export function LaborV2PreviewPanel(props: {
  form: any;
  hesap: any;
  makineler: any[];
  plakaFireOrani: number;
  onLaborCostChange?: (value: number | null) => void;
}) {
  const { onLaborCostChange } = props;
  const laborV2Result = useLaborV2Result(props);

  useEffect(() => {
    onLaborCostChange?.(laborV2Result?.totalLaborCost || null);
  }, [laborV2Result, onLaborCostChange]);

  return <LaborV2DebugPanel result={laborV2Result} />;
}
