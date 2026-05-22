"use client";

import {
  defaultForm,
  defaultParcalar,
  hesapla,
  n,
  tl,
  uid,
  type FormState,
  type MutfakTipi,
  type Parca,
} from "@/lib/hizli-teklif";
import { useEffect, useMemo, useState } from "react";

type StepId = "musteri" | "urun" | "parcalar" | "operasyonlar" | "ozet";

const STEPS: { id: StepId; label: string; short: string }[] = [
  { id: "musteri", label: "Müşteri", short: "Müşteri" },
  { id: "urun", label: "Ürün & Plaka", short: "Ürün" },
  { id: "parcalar", label: "Parçalar", short: "Parça" },
  { id: "operasyonlar", label: "Operasyonlar", short: "İşçilik" },
  { id: "ozet", label: "Özet", short: "Özet" },
];

const MUSTERI_TIPLERI = ["Ev sahibi", "Mimar", "Bayi", "Müteahhit", "İmalatçı"];
const IS_MODELLERI = [
  ["tam", "Taş + İşçilik"],
  ["sadece_iscilik", "Sadece İşçilik"],
  ["fason", "Fason Kesim"],
] as const;
const MUTFAK_TIPLERI: { id: MutfakTipi; label: string }[] = [
  { id: "duz", label: "Düz" },
  { id: "l", label: "L" },
  { id: "u", label: "U" },
  { id: "paralel", label: "Paralel" },
  { id: "coffee", label: "Coffee" },
  { id: "ozel", label: "Özel" },
];

export default function HizliTeklifPage() {
  const [step, setStep] = useState<StepId>("musteri");
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [makineler, setMakineler] = useState<any[]>([]);
  const hesap = useMemo(() => hesapla(form, makineler), [form, makineler]);

  useEffect(() => {
    fetch("/api/makineler-lite")
      .then((r) => r.json())
      .then((v) => {
        const liste = v.makineler || [];
        setMakineler(liste);
        if (liste.length > 0) {
          setForm((p) => ({
            ...p,
            tezgahMakineId: p.tezgahMakineId || liste[0].id,
            pahlamaMakineId: p.pahlamaMakineId || liste[0].id,
            kesim45MakineId: p.kesim45MakineId || liste[0].id,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const activeIndex = STEPS.findIndex((x) => x.id === step);
  const prevStep = activeIndex > 0 ? STEPS[activeIndex - 1].id : null;
  const nextStep = activeIndex < STEPS.length - 1 ? STEPS[activeIndex + 1].id : null;

  const setAlan = (key: keyof FormState, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const updateParca = (id: string, key: keyof Parca, value: any) => {
    setForm((p) => ({ ...p, parcalar: p.parcalar.map((x) => x.id === id ? { ...x, [key]: value } : x) }));
  };

  const addParca = () => {
    setForm((p) => ({
      ...p,
      parcalar: [...p.parcalar, { id: uid(), ad: `Parça ${p.parcalar.length + 1}`, en: "", boy: "", adet: "1", onAlin: false, tip: "ozel" }],
    }));
  };

  const removeParca = (id: string) => {
    setForm((p) => ({ ...p, parcalar: p.parcalar.length > 1 ? p.parcalar.filter((x) => x.id !== id) : p.parcalar }));
  };

  const changeMutfakTipi = (tip: MutfakTipi) => {
    setForm((p) => ({ ...p, mutfakTipi: tip, parcalar: defaultParcalar(tip) }));
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Metrix</p>
              <h1 className="mt-1 text-xl font-black">Hızlı Teklif Sihirbazı</h1>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
              <div className="text-[10px] font-bold text-emerald-200">Teklif</div>
              <div className="text-sm font-black text-emerald-300">{tl(hesap.satisFiyati)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1">
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const done = i < activeIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`rounded-xl border px-1 py-2 text-[10px] font-black transition ${
                    active
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : done
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.04] text-slate-500"
                  }`}
                >
                  <div>{done ? "✓" : i + 1}</div>
                  <div className="mt-0.5 truncate">{s.short}</div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5">
        <LiveSummary hesap={hesap} />

        {step === "musteri" && (
          <section className="mt-4 space-y-4">
            <Card title="Müşteri">
              <label className="block">
                <span className="label">Müşteri adı</span>
                <input className="input" value={form.musteriAdi} onChange={(e) => setAlan("musteriAdi", e.target.value)} placeholder="Örn: Aslı Uyal" />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {MUSTERI_TIPLERI.map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => setAlan("musteriTipi", tip)}
                    className={`choice ${form.musteriTipi === tip ? "choice-active" : ""}`}
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="İş Modeli">
              <div className="grid gap-2">
                {IS_MODELLERI.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setAlan("isModeli", id)} className={`choice ${form.isModeli === id ? "choice-active" : ""}`}>
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          </section>
        )}

        {step === "urun" && (
          <section className="mt-4 space-y-4">
            <Card title="Ürün">
              <label className="block">
                <span className="label">Ürün / taş adı</span>
                <input className="input" value={form.urunAdi} onChange={(e) => setAlan("urunAdi", e.target.value)} placeholder="Örn: Laminam Fokos Sale" />
              </label>
            </Card>

            <Card title="Plaka">
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Plaka en</span>
                  <input className="input" inputMode="decimal" value={form.plakaEn} onChange={(e) => setAlan("plakaEn", e.target.value)} />
                </label>
                <label>
                  <span className="label">Plaka boy</span>
                  <input className="input" inputMode="decimal" value={form.plakaBoy} onChange={(e) => setAlan("plakaBoy", e.target.value)} />
                </label>
                <label>
                  <span className="label">Euro fiyat</span>
                  <input className="input" inputMode="decimal" value={form.plakaFiyatiEuro} onChange={(e) => setAlan("plakaFiyatiEuro", e.target.value)} placeholder="450" />
                </label>
                <label>
                  <span className="label">Kur</span>
                  <input className="input" inputMode="decimal" value={form.kullanilanKur} onChange={(e) => setAlan("kullanilanKur", e.target.value)} />
                </label>
              </div>
            </Card>
          </section>
        )}

        {step === "parcalar" && (
          <section className="mt-4 space-y-4">
            <Card title="Mutfak Tipi">
              <div className="grid grid-cols-3 gap-2">
                {MUTFAK_TIPLERI.map((tip) => (
                  <button key={tip.id} type="button" onClick={() => changeMutfakTipi(tip.id)} className={`choice ${form.mutfakTipi === tip.id ? "choice-active" : ""}`}>
                    {tip.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Kesim Parçaları">
              <div className="space-y-3">
                {form.parcalar.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-slate-900 p-3">
                    <div className="flex gap-2">
                      <input className="input" value={p.ad} onChange={(e) => updateParca(p.id, "ad", e.target.value)} />
                      <button type="button" onClick={() => removeParca(p.id)} className="h-11 w-11 rounded-xl border border-red-400/20 bg-red-400/10 font-black text-red-300">×</button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <label>
                        <span className="label">En</span>
                        <input className="input" inputMode="decimal" value={p.en} onChange={(e) => updateParca(p.id, "en", e.target.value)} placeholder="65" />
                      </label>
                      <label>
                        <span className="label">Boy</span>
                        <input className="input" inputMode="decimal" value={p.boy} onChange={(e) => updateParca(p.id, "boy", e.target.value)} placeholder="290" />
                      </label>
                      <label>
                        <span className="label">Adet</span>
                        <input className="input" inputMode="decimal" value={p.adet} onChange={(e) => updateParca(p.id, "adet", e.target.value)} />
                      </label>
                    </div>
                    <button type="button" onClick={() => updateParca(p.id, "onAlin", !p.onAlin)} className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm font-black ${p.onAlin ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
                      {p.onAlin ? "✓ Ön alın var" : "Ön alın yok"}
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addParca} className="mt-3 w-full rounded-2xl border border-dashed border-emerald-400/30 px-4 py-3 text-sm font-black text-emerald-300">
                + Parça Ekle
              </button>
            </Card>
          </section>
        )}

        {step === "operasyonlar" && (
          <section className="mt-4 space-y-4">
            <Card title="Operasyonlar">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Eviye" value={form.eviyes} onChange={(v) => setAlan("eviyes", v)} />
                <NumberField label="Ocak" value={form.ocaklar} onChange={(v) => setAlan("ocaklar", v)} />
                <NumberField label="Priz / delik" value={form.prizler} onChange={(v) => setAlan("prizler", v)} />
                <NumberField label="Pahlama mtül" value={form.pahlamaMtul} onChange={(v) => setAlan("pahlamaMtul", v)} />
                <NumberField label="45 kesim mtül" value={form.kesim45Mtul} onChange={(v) => setAlan("kesim45Mtul", v)} />
              </div>
            </Card>

            <Card title="Fiyatlandırma">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAlan("fiyatModu", "carpan")} className={`choice ${form.fiyatModu === "carpan" ? "choice-active" : ""}`}>Çarpan</button>
                <button type="button" onClick={() => setAlan("fiyatModu", "kar")} className={`choice ${form.fiyatModu === "kar" ? "choice-active" : ""}`}>Kâr %</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField label="Çarpan" value={form.carpan} onChange={(v) => setAlan("carpan", v)} />
                <NumberField label="Kâr hedefi %" value={form.karHedefi} onChange={(v) => setAlan("karHedefi", v)} />
              </div>
            </Card>
          </section>
        )}

        {step === "ozet" && (
          <section className="mt-4 space-y-4">
            <Card title="Teklif Özeti">
              <SummaryRow label="Müşteri" value={form.musteriAdi || "-"} />
              <SummaryRow label="Ürün" value={form.urunAdi || "-"} />
              <SummaryRow label="Toplam mtül" value={hesap.toplamMtul.toFixed(2)} />
              <SummaryRow label="Plaka" value={`${hesap.plakaSayisi} adet`} />
              <SummaryRow label="Maliyet" value={tl(hesap.toplamMaliyet)} />
              <SummaryRow label="Satış" value={tl(hesap.satisFiyati)} strong />
              <SummaryRow label="Kâr" value={`${tl(hesap.kar)} · %${hesap.karYuzde.toFixed(1)}`} />
            </Card>
            <Card title="Not">
              <p className="text-sm leading-6 text-slate-400">
                Bu foundation patch kaydetme ve plaka planlayıcı gömme içermez. Ama hesap ve form akışı canlı çalışır.
              </p>
            </Card>
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={() => prevStep && setStep(prevStep)} disabled={!prevStep} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300 disabled:opacity-30">
            Geri
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold text-slate-500">Satış</div>
            <div className="truncate text-sm font-black text-emerald-300">{tl(hesap.satisFiyati)} · %{hesap.karYuzde.toFixed(0)} kâr</div>
          </div>
          <button type="button" onClick={() => nextStep && setStep(nextStep)} disabled={!nextStep} className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400">
            {nextStep ? "Devam" : "Tamam"}
          </button>
        </div>
      </nav>

      <style jsx>{`
        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 800;
          color: rgb(100 116 139);
        }
        .input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgb(15 23 42);
          padding: 11px 13px;
          color: white;
          outline: none;
        }
        .input:focus {
          border-color: rgb(52 211 153);
        }
        .choice {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 11px 12px;
          color: rgb(203 213 225);
          font-size: 13px;
          font-weight: 900;
        }
        .choice-active {
          border-color: rgba(52, 211, 153, 0.7);
          background: rgba(52, 211, 153, 0.14);
          color: rgb(167 243 208);
        }
      `}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10">
      <h2 className="mb-4 text-sm font-black text-white">{title}</h2>
      {children}
    </div>
  );
}

function LiveSummary({ hesap }: { hesap: ReturnType<typeof hesapla> }) {
  return (
    <div className="sticky top-[116px] z-10 grid grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur">
      <Metric label="Mtül" value={hesap.toplamMtul.toFixed(2)} />
      <Metric label="Plaka" value={String(hesap.plakaSayisi)} />
      <Metric label="Maliyet" value={tl(hesap.toplamMaliyet)} />
      <Metric label="Satış" value={tl(hesap.satisFiyati)} />
      <Metric label="Kâr" value={`%${hesap.karYuzde.toFixed(0)}`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/[0.04] px-2 py-2 text-center">
      <div className="truncate text-[9px] font-bold text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-black text-white">{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-right text-sm ${strong ? "font-black text-emerald-300" : "font-bold text-white"}`}>{value}</span>
    </div>
  );
}
