"use client";

import { normalizeMtulDisplay } from "@/lib/normalizeMtul";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PlakaPlanlayiciV2 } from "@/components/plaka-planlayici/PlakaPlanlayiciV2";
import AiYeniIsPanel from "@/components/ai/AiYeniIsPanel";

const LaborV2PreviewPanel = dynamic(
  () => import("@/components/labor-v2/LaborV2PreviewPanel").then((mod) => mod.LaborV2PreviewPanel),
  { ssr: false }
);

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function n(v: any): number {
  const x = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function tl(v: number) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}
function uid() { return Math.random().toString(36).slice(2, 8); }
function parcaMtul(p: Pick<Parca, "en" | "boy" | "adet">): number {
  const en = n(p.en), boy = n(p.boy), adet = n(p.adet) || 1;
  return en > 0 && boy > 0 ? (boy / 100) * adet : 0;
}
function operasyonMtulHesapla(parcalar: Parca[], manualPahlamaMtul: any, manualKesim45Mtul: any) {
  const autoPahlamaMtul = parcalar.reduce((acc, p) => acc + parcaMtul(p), 0);
  const autoKesim45Mtul = parcalar.reduce((acc, p) => acc + (p.onAlin ? parcaMtul(p) : 0), 0);
  const manualPahlama = n(manualPahlamaMtul);
  const manualKesim45 = n(manualKesim45Mtul);
  return {
    autoPahlamaMtul,
    autoKesim45Mtul,
    manualPahlamaMtul: manualPahlama,
    manualKesim45Mtul: manualKesim45,
    effectivePahlamaMtul: autoPahlamaMtul + manualPahlama,
    effectiveKesim45Mtul: autoKesim45Mtul + manualKesim45,
  };
}

const TASLAK_KEY = "metrix_yeni_is_v3_taslak";
const TASLAK_KEY_LEGACY = "metrix_yeni_is_v4_taslak";

// ─── Tipler ───────────────────────────────────────────────────────────────────
type Adim = "musteri" | "olculer" | "fiyat";
type IsModeli = "tam" | "sadece_iscilik" | "fason";
type MutfakTipi = "duz" | "l" | "u" | "paralel" | "coffee" | "ozel";
type SekilTipi = "dikdortgen" | "oval" | "kapsul" | "l_parca" | "ozel_sablon";

interface Parca {
  id: string;
  ad: string;
  en: string;   // cm
  boy: string;  // cm
  adet: string;
  onAlin: boolean;
  tip: "tezgah" | "panel" | "ada" | "tezgah_arasi" | "ozel";
  sekilTipi?: SekilTipi;
  shapeNotu?: string;
}

interface FormState {
  // Müşteri
  musteriId: string;
  musteriAdi: string;
  musteriTipi: string;
  isTarihi: string;
  urunAdi: string;
  // İş modeli
  isModeli: IsModeli;
  mutfakTipi: MutfakTipi;
  // Parçalar
  parcalar: Parca[];
  // Ekstra işler
  eviyes: string;       // adet
  ocaklar: string;
  prizler: string;
  pahlamaMtul: string;
  kesim45Mtul: string;
  // Plaka
  plakaFiyati: string;  // TL (direkt TL de girilebilir)
  plakaFiyatiEuro: string;
  kullanilanKur: string;
  plakaEn: string;
  plakaBoy: string;
  plakaLayoutJson: any;
  plakaImageUrl: string;
  // Fiyatlandırma
  carpan: string;       // ×2, ×2.5, ×3 vb
  karHedefi: string;    // % alternatif
  fiyatModu: "carpan" | "kar"; // hangisiyle hesaplansın
  manuelBirimFiyat: string;    // override
  // Makine/süre (gelişmiş)
  tezgahMakineId: string;
  tezgahDakika: string;
  pahlamaMakineId: string;
  pahlamaDakika: string;
  kesim45MakineId: string;
  kesim45Dakika: string;
  // Meta
  notlar: string;
  onAlinEnOverride?: Record<string, string>;
}

// ─── Mutfak tipleri ───────────────────────────────────────────────────────────
const MUTFAK_TIPLERI: { id: MutfakTipi; label: string; aciklama: string; svg: string }[] = [
  {
    id: "duz", label: "Düz Tezgah", aciklama: "Tek yön, karşısı boş",
    svg: `<svg viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="20" width="70" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="32" width="70" height="5" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>`
  },
  {
    id: "l", label: "L Tezgah", aciklama: "İki yön, köşe birleşim",
    svg: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="12" height="40" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="38" width="55" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="17" y="38" width="43" height="5" rx="1" fill="currentColor" opacity="0.3"/>
      <rect x="5" y="10" width="5" height="28" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>`
  },
  {
    id: "u", label: "U Tezgah", aciklama: "Üç yön, tam çevre",
    svg: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="12" height="40" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="63" y="10" width="12" height="40" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="38" width="70" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="38" width="3" height="12" rx="1" fill="currentColor" opacity="0.2"/>
    </svg>`
  },
  {
    id: "paralel", label: "Paralel", aciklama: "Karşılıklı iki tezgah",
    svg: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="70" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="38" width="70" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="22" width="70" height="5" rx="1" fill="currentColor" opacity="0.2"/>
      <rect x="5" y="33" width="70" height="5" rx="1" fill="currentColor" opacity="0.2"/>
    </svg>`
  },
  {
    id: "coffee", label: "Coffee Corner", aciklama: "Ana tezgah + küçük köşe",
    svg: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="20" width="50" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <rect x="55" y="10" width="20" height="22" rx="2" fill="currentColor" opacity="0.5"/>
      <rect x="5" y="32" width="50" height="5" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>`
  },
  {
    id: "ozel", label: "Özel / Diğer", aciklama: "Serbest parça girişi",
    svg: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="40" y="35" text-anchor="middle" font-size="24" fill="currentColor" opacity="0.8">+</text>
    </svg>`
  },
];

// ─── İş modeli ────────────────────────────────────────────────────────────────
const IS_MODELLERI = [
  { id: "tam"           as IsModeli, label: "Taş + İşçilik", ikon: "🪨", aciklama: "Taş bizden, her şey dahil" },
  { id: "sadece_iscilik"as IsModeli, label: "Sadece İşçilik", ikon: "⚙️", aciklama: "Taşı müşteri alıyor" },
  { id: "fason"         as IsModeli, label: "Fason Kesim",   ikon: "✂️", aciklama: "Sadece kesim/ebatlama" },
];

const SEKIL_TIPLERI: { id: SekilTipi; label: string }[] = [
  { id: "dikdortgen", label: "Dikdörtgen" },
  { id: "oval", label: "Oval" },
  { id: "kapsul", label: "Kapsül / Oval uçlu" },
  { id: "l_parca", label: "L Parça" },
  { id: "ozel_sablon", label: "Özel Şablon" },
];

function sekilOlcuMetni(sekilTipi?: SekilTipi) {
  switch (sekilTipi || "dikdortgen") {
    case "oval":
      return {
        enLabel: "Kısa Çap (cm)",
        boyLabel: "Uzun Çap (cm)",
        enPlaceholder: "80",
        boyPlaceholder: "180",
        helper: "Plaka yerleşiminde kapladığı dikdörtgen alan kullanılır.",
        notGoster: false,
      };
    case "kapsul":
      return {
        enLabel: "Genişlik / Çap (cm)",
        boyLabel: "Toplam Boy (cm)",
        enPlaceholder: "80",
        boyPlaceholder: "180",
        helper: "Oval uçlu parça bounding box ile yerleşir.",
        notGoster: false,
      };
    case "l_parca":
      return {
        enLabel: "Genişlik (cm)",
        boyLabel: "Toplam Boy (cm)",
        enPlaceholder: "80",
        boyPlaceholder: "220",
        helper: "İlk fazda L parça kapladığı dikdörtgen alanla yerleşir. Detayı not olarak yazın.",
        notGoster: true,
      };
    case "ozel_sablon":
      return {
        enLabel: "Kapladığı En (cm)",
        boyLabel: "Kapladığı Boy (cm)",
        enPlaceholder: "80",
        boyPlaceholder: "180",
        helper: "Özel şablon ilk fazda kapladığı dikdörtgen alanla hesaplanır.",
        notGoster: true,
      };
    default:
      return {
        enLabel: "En (cm)",
        boyLabel: "Boy (cm)",
        enPlaceholder: "65",
        boyPlaceholder: "285",
        helper: "",
        notGoster: false,
      };
  }
}

// ─── Müşteri tipleri ──────────────────────────────────────────────────────────
const MUSTERI_TIPLERI = [
  { id: "Ev sahibi",  label: "Ev Sahibi",  ikon: "🏡", carpan: "3.0"  },
  { id: "Mimar",      label: "Mimar",      ikon: "📐", carpan: "2.8"  },
  { id: "Bayi",       label: "Bayi",       ikon: "🏪", carpan: "2.5"  },
  { id: "Müteahhit",  label: "Müteahhit",  ikon: "🦺", carpan: "2.3"  },
  { id: "İmalatçı",   label: "İmalatçı",   ikon: "🏭", carpan: "2.0"  },
];

// ─── Mutfak tipine göre varsayılan parçalar ───────────────────────────────────
function defaultParcalar(tip: MutfakTipi): Parca[] {
  const p = (ad: string, t: Parca["tip"]): Parca => ({
    id: uid(), ad, en: "", boy: "", adet: "1", onAlin: t === "tezgah" || t === "ada", tip: t, sekilTipi: "dikdortgen",
  });
  switch (tip) {
    case "duz":     return [p("Tezgah", "tezgah")];
    case "l":       return [p("Ana Tezgah", "tezgah"), p("Yan Tezgah", "tezgah")];
    case "u":       return [p("Ana Tezgah", "tezgah"), p("Sol Tezgah", "tezgah"), p("Sağ Tezgah", "tezgah")];
    case "paralel": return [p("Ana Tezgah", "tezgah"), p("Karşı Tezgah", "tezgah")];
    case "coffee":  return [p("Ana Tezgah", "tezgah"), p("Coffee Corner", "ada")];
    case "ozel":    return [p("Parça 1", "ozel")];
    default:        return [p("Tezgah", "tezgah")];
  }
}

// ─── Hesap motoru ─────────────────────────────────────────────────────────────
function hesapla(form: FormState, makineler: any[]) {
  const makineMaliyet = (id: string) => {
    const m = makineler.find((x) => x.id === id);
    return Number(m?.dakikalikMaliyet ?? m?.dkMaliyet ?? m?.dakikaMaliyet ?? m?.hesaplananDakikaMaliyeti ?? 0) || 106;
  };

  // Toplam mtül hesabı — her parçanın en×boy/10000 × adet
  let toplamMtul = 0;
  let toplamOnAlinMtul = 0;
  for (const p of form.parcalar) {
    const en = n(p.en), boy = n(p.boy), adet = n(p.adet) || 1;
    if (en > 0 && boy > 0) {
      const mtul = (boy / 100) * adet; // boy cm → mtül (1 mtül = 1m uzunluk)
      toplamMtul += mtul;
      if (p.onAlin) toplamOnAlinMtul += mtul;
    }
  }

  // Plaka hesabı
  // Plaka alanı cm² → kaç parça sığar
  const plakaEn  = n(form.plakaEn)  || 160;
  const plakaBoy = n(form.plakaBoy) || 320;
  const plakaAlani = plakaEn * plakaBoy; // cm²

  let toplamParcaAlani = 0;
  for (const p of form.parcalar) {
    const en = n(p.en), boy = n(p.boy), adet = n(p.adet) || 1;
    if (en > 0 && boy > 0) toplamParcaAlani += en * boy * adet;
  }

  const plakaSayisi = form.plakaLayoutJson?.plakaSayisi > 0
    ? Number(form.plakaLayoutJson.plakaSayisi)
    : plakaAlani > 0 && toplamParcaAlani > 0
      ? Math.ceil(toplamParcaAlani / (plakaAlani * 0.75)) // %75 verim
      : 0;

  const plakaFiyatiTl = n(form.plakaFiyati) > 0
    ? n(form.plakaFiyati)
    : n(form.plakaFiyatiEuro) * n(form.kullanilanKur);

  const malzemeMaliyeti = form.isModeli === "tam" ? plakaSayisi * plakaFiyatiTl : 0;
  const operasyonMtul = operasyonMtulHesapla(form.parcalar, form.pahlamaMtul, form.kesim45Mtul);

  // İşçilik maliyeti (makine dakika ücreti)
  const tezgahDk   = toplamMtul * n(form.tezgahDakika || "25");
  const pahlamaDk  = operasyonMtul.effectivePahlamaMtul * n(form.pahlamaDakika || "1");
  const kesim45Dk  = operasyonMtul.effectiveKesim45Mtul * n(form.kesim45Dakika || "4");
  const toplamDakika = tezgahDk + pahlamaDk + kesim45Dk;

  const iscilikMaliyeti = tezgahDk  * makineMaliyet(form.tezgahMakineId)
    + pahlamaDk  * makineMaliyet(form.pahlamaMakineId)
    + kesim45Dk  * makineMaliyet(form.kesim45MakineId);

  const eviyeMaliyet  = n(form.eviyes)  * 200 * makineMaliyet(form.tezgahMakineId);
  const ocakMaliyet   = n(form.ocaklar) * 150 * makineMaliyet(form.tezgahMakineId);
  const prizMaliyet   = n(form.prizler)  * 50  * makineMaliyet(form.tezgahMakineId);
  const toplamMaliyet = malzemeMaliyeti + iscilikMaliyeti + eviyeMaliyet + ocakMaliyet + prizMaliyet;

  // Satış fiyatı
  let satisFiyati = 0;
  if (form.manuelBirimFiyat && n(form.manuelBirimFiyat) > 0) {
    satisFiyati = n(form.manuelBirimFiyat) * toplamMtul;
  } else if (form.fiyatModu === "carpan") {
    // Çarpan: plaka maliyeti × çarpan / toplam mtül = birim fiyat
    if (form.isModeli === "tam") {
      satisFiyati = malzemeMaliyeti * n(form.carpan);
    } else {
      satisFiyati = iscilikMaliyeti * n(form.carpan);
    }
  } else {
    satisFiyati = toplamMaliyet * (1 + n(form.karHedefi) / 100);
  }

  const kar = satisFiyati - toplamMaliyet;
  const karYuzde = toplamMaliyet > 0 ? (kar / toplamMaliyet) * 100 : 0;
  const birimFiyat = toplamMtul > 0 ? satisFiyati / toplamMtul : 0;

  return {
    toplamMtul, toplamOnAlinMtul, toplamParcaAlani, plakaSayisi,
    plakaFiyatiTl, malzemeMaliyeti, iscilikMaliyeti, toplamMaliyet,
    satisFiyati, kar, karYuzde, birimFiyat, toplamDakika,
    eviyeMaliyet, ocakMaliyet, prizMaliyet,
    ...operasyonMtul,
  };
}

// ─── Varsayılan form ──────────────────────────────────────────────────────────
function defaultForm(): FormState {
  return {
    musteriId: "", musteriAdi: "", musteriTipi: "Ev sahibi",
    isTarihi: new Date().toISOString().slice(0, 10),
    urunAdi: "", isModeli: "tam", mutfakTipi: "duz",
    parcalar: defaultParcalar("duz"),
    eviyes: "0", ocaklar: "0", prizler: "0",
    pahlamaMtul: "", kesim45Mtul: "",
    plakaFiyati: "", plakaFiyatiEuro: "", kullanilanKur: "53",
    plakaEn: "160", plakaBoy: "320",
    plakaLayoutJson: null, plakaImageUrl: "",
    carpan: "3.0", karHedefi: "30", fiyatModu: "carpan",
    manuelBirimFiyat: "",
    tezgahMakineId: "", tezgahDakika: "25",
    pahlamaMakineId: "", pahlamaDakika: "1",
    kesim45MakineId: "", kesim45Dakika: "4",
    notlar: "",
  };
}

// ─── YiChip ──────────────────────────────────────────────────────────────────
function YiChip({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B1120] px-3 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xs font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA SAYFA
// ═══════════════════════════════════════════════════════════════════════════════
export default function YeniIsV3Page() {
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);
  const taslakRef = useRef<any>(null);

  const [aktifAdim, setAktifAdim] = useState<Adim>("musteri");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [musteriler, setMusteriler] = useState<any[]>([]);
  const [makineler, setMakineler]   = useState<any[]>([]);
  const [musteriArama, setMusteriArama]     = useState("");
  const [musteriListeAcik, setMusteriListeAcik] = useState(false);
  const [plakaAcik, setPlakaAcik]           = useState(false);
  const [plakaInitialRows, setPlakaInitialRows] = useState<any[]>([]);
  const [aiMode, setAiMode]                 = useState(false);
  const [kaydediliyor, setKaydediliyor]     = useState(false);
  const [basariEkrani, setBasariEkrani]     = useState(false);
  const [sonTeklifNo, setSonTeklifNo]       = useState("");
  const [sonIsId, setSonIsId]               = useState("");
  const [yeniMusteri, setYeniMusteri]       = useState(false);
  const [taslakKaydedildi, setTaslakKaydedildi] = useState(false);
  const [gelismisAcik, setGelismisAcik]     = useState(false);
  const [plakaHesaplaniyor, setPlakaHesaplaniyor] = useState(false);
  const [plakaSlabs, setPlakaSlabs]         = useState<any[]>([]);
  const [plakaPlakaSayisi, setPlakaPlakaSayisi] = useState(0);
  const [plakaFireOrani, setPlakaFireOrani] = useState(0);
  const [duzenleId, setDuzenleId]           = useState<string | null>(null);
  const [duzenleYukleniyor, setDuzenleYukleniyor] = useState(false);

  // Layout override
  useEffect(() => {
    const main  = document.getElementById("dashboard-main");
    const inner = document.getElementById("dashboard-inner");
    const ms = main?.getAttribute("style")  || "";
    const is = inner?.getAttribute("style") || "";
    if (main)  { main.style.overflow = "hidden"; main.style.height = "100dvh"; main.style.minHeight = "unset"; main.style.paddingBottom = "0"; }
    if (inner) { inner.style.overflow = "hidden"; inner.style.height = "100dvh"; inner.style.minHeight = "unset"; }
    return () => { if (main) main.setAttribute("style", ms); if (inner) inner.setAttribute("style", is); };
  }, []);

  // Taslak yükle / Düzenleme modu
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const duzenleIdParam = url.searchParams.get("duzenle");
      if (duzenleIdParam) {
        setDuzenleId(duzenleIdParam);
        setDuzenleYukleniyor(true);
        fetch(`/api/isler/${duzenleIdParam}`).then(r => r.json()).then(json => {
          const is = json.is || json;
          if (!is?.id) return;
          // Operasyonlardan pahlamaMtul, kesim45Mtul bul
          const ops = is.operasyonlar || [];
          const pahlamaOp = ops.find((o: any) => o.operasyonTipi === 'pahlama');
          const kesim45Op = ops.find((o: any) => o.operasyonTipi === '45_kesim');
          const tezgahOp  = ops.find((o: any) => o.operasyonTipi === 'tezgah');
          const yuklenenParcalar: Parca[] = [
            ...(Number(is.metrajMtul) > 0 ? [{
              id: 'yuklenen-tezgah',
              ad: 'Tezgah',
              en: '60',
              boy: String((Number(is.metrajMtul) * 100).toFixed(0)),
              adet: '1',
              onAlin: false,
              tip: 'tezgah' as const,
              sekilTipi: 'dikdortgen' as const,
            }] : []),
            ...(Number(is.tezgahArasiMtul) > 0 ? [{
              id: 'yuklenen-tezgah-arasi',
              ad: 'Tezgah Arası',
              en: '10',
              boy: String((Number(is.tezgahArasiMtul) * 100).toFixed(0)),
              adet: '1',
              onAlin: false,
              tip: 'tezgah_arasi' as const,
              sekilTipi: 'dikdortgen' as const,
            }] : []),
            ...(Number(is.adaTezgahMtul) > 0 ? [{
              id: 'yuklenen-ada',
              ad: 'Ada Tezgah',
              en: '90',
              boy: String((Number(is.adaTezgahMtul) * 100).toFixed(0)),
              adet: '1',
              onAlin: false,
              tip: 'ada' as const,
              sekilTipi: 'dikdortgen' as const,
            }] : []),
          ].filter(p => p.boy !== '0');
          const yuklenenPahlamaToplam = pahlamaOp?.toplamDakika && pahlamaOp?.birimDakika ? (pahlamaOp.toplamDakika / pahlamaOp.birimDakika) : n(is.pahlamaMtul);
          const yuklenenKesim45Toplam = kesim45Op?.toplamDakika && kesim45Op?.birimDakika ? (kesim45Op.toplamDakika / kesim45Op.birimDakika) : n(is.kesim45Mtul);
          const yuklenenAuto = operasyonMtulHesapla(yuklenenParcalar, 0, 0);
          const yuklenenManualPahlama = Math.max(0, yuklenenPahlamaToplam - yuklenenAuto.autoPahlamaMtul);
          const yuklenenManualKesim45 = Math.max(0, yuklenenKesim45Toplam - yuklenenAuto.autoKesim45Mtul);
          setForm(p => ({
            ...p,
            musteriId:       is.musteriId || '',
            musteriAdi:      is.musteriAdi || '',
            musteriTipi:     is.musteriTipi || 'son_kullanici',
            urunAdi:         is.urunAdi || '',
            notlar:          is.notlar || '',
            plakaFiyatiEuro: String(is.plakaFiyatiEuro || ''),
            kullanilanKur:   String(is.kullanilanKur || '53'),
            plakaEn:         String(is.plakaGenislikCm || '160'),
            plakaBoy:        String(is.plakaUzunlukCm || '320'),
            tezgahDakika:    String(is.birMtulDakika || '25'),
            pahlamaMtul:     yuklenenManualPahlama > 0 ? yuklenenManualPahlama.toFixed(2) : '',
            pahlamaDakika:   String(pahlamaOp?.birimDakika || '1'),
            kesim45Mtul:     yuklenenManualKesim45 > 0 ? yuklenenManualKesim45.toFixed(2) : '',
            kesim45Dakika:   String(kesim45Op?.birimDakika || '4'),
            tezgahMakineId:  tezgahOp?.makineId || p.tezgahMakineId,
            pahlamaMakineId: pahlamaOp?.makineId || p.pahlamaMakineId,
            kesim45MakineId: kesim45Op?.makineId || p.kesim45MakineId,
            karHedefi:       String(is.karYuzdesi || '30'),
            plakaLayoutJson: is.plakaLayoutJson || null,
            plakaImageUrl:   is.plakaImageUrl || '',
            // Ölçüleri parcalar'a dönüştür
            parcalar: yuklenenParcalar,
          }));
        }).catch(() => {}).finally(() => setDuzenleYukleniyor(false));
        return;
      }
      if (url.searchParams.get("fresh") === "1") { localStorage.removeItem(TASLAK_KEY); return; }
      const ham = localStorage.getItem(TASLAK_KEY) || localStorage.getItem(TASLAK_KEY_LEGACY);
      if (ham) {
        const t = JSON.parse(ham);
        if (t?.musteriAdi || t?.urunAdi) setForm((p) => ({ ...p, ...t }));
      }
    } catch {}
  }, []);

  // Taslak kaydet (debounce)
  useEffect(() => {
    clearTimeout(taslakRef.current);
    taslakRef.current = setTimeout(() => {
      try {
        localStorage.setItem(TASLAK_KEY, JSON.stringify(form));
        setTaslakKaydedildi(true);
        setTimeout(() => setTaslakKaydedildi(false), 1200);
      } catch {}
    }, 1000);
    return () => clearTimeout(taslakRef.current);
  }, [form]);

  // Adım scroll
  useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [aktifAdim]);

  // API
  useEffect(() => {
    fetch("/api/musteriler-lite").then((r) => r.json()).then((v) => setMusteriler(v.musteriler || []));
    fetch("/api/makineler-lite").then((r) => r.json()).then((v) => {
      const liste = v.makineler || [];
      setMakineler(liste);
      if (liste.length > 0) {
        setForm((p) => ({
          ...p,
          tezgahMakineId:    p.tezgahMakineId    || liste[0].id,
          pahlamaMakineId:   p.pahlamaMakineId   || liste[0].id,
          kesim45MakineId:   p.kesim45MakineId   || liste[0].id,
        }));
      }
    });
  }, []);

  const setAlan = useCallback((key: keyof FormState, val: any) => {
    setForm((p) => ({ ...p, [key]: val }));
  }, []);

  // Parça adını API'nin anlayacağı parcaTuru'na normalize et
  function normalizeParcaTuru(ad: string): string {
    const s = ad.toLocaleLowerCase("tr-TR")
      .replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g")
      .replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").trim();
    if (s.includes("on alin") || s.includes("ön alın") || s.includes("on alin")) return "ön alın";
    if (s.includes("tezgah arasi") || s.includes("tezgah arası")) return "tezgah arası";
    if (s.includes("ada tezgah")) return "ada tezgah";
    if (s.includes("ada ayak")) return "ada ayak";
    if (s.includes("tezgah")) return "tezgah";
    if (s.includes("panel")) return "tezgah arası";
    if (s.includes("supurgelik") || s.includes("süpürgelik")) return "süpürgelik";
    if (s.includes("davlumbaz")) return "davlumbaz";
    return "tezgah"; // default
  }

  // Planlayıcı açmadan direkt AI layout API'ye hesaplat
  async function plakaHesapla() {
    const plakaEn  = n(form.plakaEn)  || 160;
    const plakaBoy = n(form.plakaBoy) || 320;
    if (!plakaEn || !plakaBoy) { alert("Önce plaka ölçüsü girin (En/Boy cm)."); return; }

    // Her ünite (adet) kendi damar setini oluşturur — ön alın + tezgah birlikte
    // Önce her parçanın max adetini bul
    const maxAdet = form.parcalar.reduce((acc, p) => Math.max(acc, n(p.adet) || 1), 1);
    const pieces: any[] = [];
    let id = 1;

    for (let unite = 0; unite < maxAdet; unite++) {
      const tipAdi = `Unite-${unite + 1}`;
      // Önce ön alınları ekle (damar sırasına göre)
      form.parcalar.forEach((p) => {
        const en = n(p.en), boy = n(p.boy), adet = Math.max(1, n(p.adet) || 1);
        if (en <= 0 || boy <= 0 || unite >= adet) return;
        if (p.onAlin) {
          const oaEn = n(form.onAlinEnOverride?.["toplam"]) || 4;
          pieces.push({ id: id++, label: `${p.ad} Ön Alın #${unite+1}`, parcaTuru: "ön alın", tipAdi, genislik: boy, yukseklik: oaEn, sekilTipi: "dikdortgen" });
        }
      });
      // Sonra tezgahları ekle
      form.parcalar.forEach((p) => {
        const en = n(p.en), boy = n(p.boy), adet = Math.max(1, n(p.adet) || 1);
        if (en <= 0 || boy <= 0 || unite >= adet) return;
        const parcaTuru = normalizeParcaTuru(p.ad);
        pieces.push({ id: id++, label: `${p.ad} #${unite+1}`, parcaTuru, tipAdi, genislik: boy, yukseklik: en, sekilTipi: p.sekilTipi || "dikdortgen", shapeNotu: p.shapeNotu });
      });
    }

    if (pieces.length === 0) { alert("Önce parça ölçülerini girin."); return; }

    setPlakaHesaplaniyor(true);
    try {
      const res = await fetch("/api/ai-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaka: { genislik: plakaEn, yukseklik: plakaBoy }, pieces }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { alert(json?.error || "Hesaplama hatası."); return; }
      setAlan("plakaLayoutJson", { plakaSayisi: json.plakaSayisi, slabs: json.slabs, fireOrani: json.fireOrani });
      setPlakaSlabs(json.slabs || []);
      setPlakaPlakaSayisi(json.plakaSayisi || 0);
      setPlakaFireOrani(json.fireOrani || 0);
    } catch(e: any) {
      alert(e?.message || "Hata.");
    } finally {
      setPlakaHesaplaniyor(false);
    }
  }

  // Müşteri tipine göre carpan öner
  function musteriSecVeCarpanOner(m: any) {
    const tipMap: Record<string, string> = { bayi: "Bayi", mimar: "Mimar", son_kullanici: "Ev sahibi", muteahhit: "Müteahhit" };
    const ad = [m.firmaAdi, m.ad, m.soyad].filter(Boolean).join(" ") || m.ad || "";
    const tip = m.musteriTipi ? (tipMap[m.musteriTipi] || "Ev sahibi") : "Ev sahibi";
    const carpan = MUSTERI_TIPLERI.find((t) => t.id === tip)?.carpan || "3.0";
    setForm((p) => ({ ...p, musteriId: m.id, musteriAdi: ad, musteriTipi: tip, carpan }));
    setMusteriArama(""); setMusteriListeAcik(false);
  }

  function mutfakTipiDegistir(tip: MutfakTipi) {
    setForm((p) => ({ ...p, mutfakTipi: tip, parcalar: defaultParcalar(tip) }));
  }

  function parcaGuncelle(id: string, field: keyof Parca, val: any) {
    setForm((p) => ({ ...p, parcalar: p.parcalar.map((x) => x.id === id ? { ...x, [field]: val } : x) }));
  }
  function parcaEkle() {
    setForm((p) => ({ ...p, parcalar: [...p.parcalar, { id: uid(), ad: `Parça ${p.parcalar.length + 1}`, en: "", boy: "", adet: "1", onAlin: false, tip: "ozel" as const, sekilTipi: "dikdortgen" as const }] }));
  }

  // Parça güncellenince otomatik operasyonlar derived hesaplanır; ilave/manual değerler korunur.
  function parcaGuncelleVeHesapla(id: string, field: keyof Parca, val: any) {
    setForm((prev) => {
      const yeniParcalar = prev.parcalar.map((x) => x.id === id ? { ...x, [field]: val } : x);
      return {
        ...prev,
        parcalar: yeniParcalar,
      };
    });
  }
  function parcaSil(id: string) {
    setForm((p) => ({ ...p, parcalar: p.parcalar.filter((x) => x.id !== id) }));
  }

  const hesap = useMemo(() => hesapla(form, makineler), [form, makineler]);
  const laborV2Enabled = process.env.NEXT_PUBLIC_LABOR_V2_PREVIEW === "true";

  // Kaydet
  async function kaydet() {
    if (!form.musteriAdi.trim()) { alert("Müşteri adı gerekli."); return; }
    setKaydediliyor(true);
    try {
      // Eski API formatına dönüştür
      const operasyonlar = [
        { tip: "tezgah", mtul: hesap.toplamMtul, dakika: n(form.tezgahDakika), makineId: form.tezgahMakineId },
        { tip: "pahlama", mtul: hesap.effectivePahlamaMtul, dakika: n(form.pahlamaDakika), makineId: form.pahlamaMakineId },
        { tip: "45_kesim", mtul: hesap.effectiveKesim45Mtul, dakika: n(form.kesim45Dakika), makineId: form.kesim45MakineId },
      ].filter((x) => x.mtul > 0 && x.dakika > 0).map((x) => ({
        operasyonTipi: x.tip, makineId: x.makineId || null,
        adet: 1, birimDakika: x.dakika, toplamDakika: x.mtul * x.dakika,
      }));

      const body = {
        musteriId: form.musteriId || null,
        musteriAdi: form.musteriAdi,
        urunAdi: form.urunAdi || form.mutfakTipi,
        malzemeTipi: "Porselen",
        musteriTipi: form.musteriTipi,
        isTarihi: form.isTarihi,
        plakaFiyatiEuro: n(form.plakaFiyatiEuro) > 0
          ? n(form.plakaFiyatiEuro)
          : n(form.plakaFiyati) > 0 && n(form.kullanilanKur) > 0
            ? n(form.plakaFiyati) / n(form.kullanilanKur)
            : 0,
        plakaFiyatiTl: n(form.plakaFiyati) > 0
          ? n(form.plakaFiyati)
          : n(form.plakaFiyatiEuro) * n(form.kullanilanKur),
        kullanilanKur: n(form.kullanilanKur),
        karYuzdesi: String(hesap.karYuzde.toFixed(1)),
        metrajMtul: String(hesap.toplamMtul.toFixed(2)),
        birMtulDakika: form.tezgahDakika,
        tezgahArasiMtul: "0", tezgahArasiDakika: "0",
        adaTezgahMtul: "0", adaTezgahDakika: "0",
        plakaGenislikCm: form.plakaEn,
        plakaUzunlukCm: form.plakaBoy,
        plakadanAlinanMtul: "5",
        manuelPlakaSayisi: String(hesap.plakaSayisi),
        operasyonlar,
        plakaLayoutJson: form.plakaLayoutJson || null,
        plakaImageUrl: form.plakaImageUrl || "",
        notlar: form.notlar,
        tasDurumu: form.isModeli,
        ozelIscilik1Mtul: "0", ozelIscilik1Dakika: "0",
        ozelIscilik2Mtul: "0", ozelIscilik2Dakika: "0",
        ozelIscilik3Mtul: "0", ozelIscilik3Dakika: "0",
        kesim45Mtul: String(hesap.effectiveKesim45Mtul.toFixed(2)), kesim45Dakika: form.kesim45Dakika, kesim45MakineId: form.kesim45MakineId,
        pahlamaMtul: String(hesap.effectivePahlamaMtul.toFixed(2)), pahlamaDakika: form.pahlamaDakika, pahlamaMakineId: form.pahlamaMakineId,
        yapistirmaMtul: "0", yapistirmaDakika: "0", yapistirmaMakineId: "",
        tezgahMakineId: form.tezgahMakineId, tezgahArasiMakineId: "", adaMakineId: "",
        stresAlmaMakineId: "", fasonEbatlamaMakineId: "",
      };

      const res = await fetch(
        duzenleId ? `/api/isler/${duzenleId}` : "/api/isler",
        { method: duzenleId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const raw = await res.text();
      let veri: any = {};
      try { veri = raw ? JSON.parse(raw) : {}; } catch { veri = { hata: raw }; }
      if (!res.ok) { alert(veri?.hata || "İş kaydedilemedi."); return; }
      setSonTeklifNo(String(veri?.teklifNo || veri?.is?.teklifNo || ""));
      setSonIsId(String(duzenleId || veri?.id || veri?.isId || veri?.is?.id || ""));
      setYeniMusteri(veri?.yeniMusteriOlusturuldu === true);
      try { localStorage.removeItem(TASLAK_KEY); } catch {}
      setBasariEkrani(true);
    } catch (e: any) {
      alert(e?.message || "Hata oluştu.");
    } finally {
      setKaydediliyor(false);
    }
  }

  function whatsappGonder() {
    const link = sonTeklifNo ? `${window.location.origin}/teklif/${sonTeklifNo}` : "";
    if (!link) { alert("Önce kaydet."); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`Merhaba, teklifinizi inceleyip onaylayabilirsiniz:\n\n${link}`)}`, "_blank");
  }
  function pdfAc() { if (sonIsId) window.open(`/api/isler/${sonIsId}/pdf`, "_blank"); }
  function tahsilatAc() { if (sonIsId) router.push(`/dashboard/tahsilatlar?isId=${sonIsId}`); else router.push('/dashboard/tahsilatlar'); }
  async function linkKopyala() {
    const link = sonTeklifNo ? `${window.location.origin}/teklif/${sonTeklifNo}` : "";
    if (link) { await navigator.clipboard.writeText(link); alert("Kopyalandı."); }
  }

  const adimlar: { id: Adim; label: string; kisa: string }[] = [
    { id: "musteri",  label: "Müşteri & İş",   kisa: "Müşteri" },
    { id: "olculer",  label: "Ölçüler",         kisa: "Ölçüler" },
    { id: "fiyat",    label: "Fiyat & Kaydet",  kisa: "Fiyat"   },
  ];
  const aktifIdx   = adimlar.findIndex((a) => a.id === aktifAdim);
  const onceki     = aktifIdx > 0 ? adimlar[aktifIdx - 1].id : null;
  const sonraki    = aktifIdx < adimlar.length - 1 ? adimlar[aktifIdx + 1].id : null;
  const filtreli   = musteriler.filter((m) => String(m.ad || "").toLocaleLowerCase("tr-TR").includes(musteriArama.toLocaleLowerCase("tr-TR")));

  // ─── DÜZENLEME YÜKLENİYOR ────────────────────────────────────────────────
  if (duzenleYukleniyor) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">İş verisi yükleniyor...</p>
      </div>
    );
  }

  // ─── AI MODU ──────────────────────────────────────────────────────────────
  if (aiMode) {
    return (
      <div style={{ height: "100dvh", overflowY: "auto", background: "#030712", color: "#fff", padding: "12px 12px calc(112px + env(safe-area-inset-bottom, 0px))", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "100px", padding: "6px 18px", marginBottom: "16px" }}>
              <span>✨</span><span style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.1em" }}>AI MODU</span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 8px" }}>Yeni İşi Anlat</h1>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>Ölçüleri yaz veya konuş, AI formu doldursun</p>
          </div>
          <AiYeniIsPanel
            onApply={(data: any) => {
              const s = data?.sonuc || data || {};

              // Parçalar: enCm=genişlik(en), boyCm=uzunluk(boy) — ön alınları filtrele
              const parcalar = (s?.parcalar || [])
                .filter((p: any) => Number(p.boyCm) > 0 && Number(p.enCm) > 0 && !(p.standartTip || "").includes("on_alin"))
                .map((p: any) => ({
                  id: Math.random().toString(36).slice(2, 8),
                  ad: p.etiket || p.standartTip || "Parça",
                  en: String(p.enCm || ""),   // en = cm cinsinden genişlik
                  boy: String(p.boyCm || ""), // boy = cm cinsinden uzunluk
                  adet: String(p.adet || "1"),
                  onAlin: false,
                  tip: "ozel" as const,
                  sekilTipi: "dikdortgen" as const,
                }));

              // Ön alın varsa ilk tezgaha onAlin=true set et
              const onAlinVar = (s?.parcalar || []).some((p: any) => (p.standartTip || "").includes("on_alin"));
              if (onAlinVar && parcalar.length > 0) parcalar[0].onAlin = true;

              // Plaka ölçüsü: AI'dan gelen enCm/boyCm — büyük olan en (genişlik), küçük olan boy (yükseklik)
              const aiPlakaEn  = Number(s?.malzeme?.plakaOlcusu?.enCm  || 0);
              const aiPlakaBoy = Number(s?.malzeme?.plakaOlcusu?.boyCm || 0);
              // Normalize: en >= boy olsun (plaka genellikle yatay)
              const plakaEn  = String(Math.max(aiPlakaEn, aiPlakaBoy) || 320);
              const plakaBoy = String(Math.min(aiPlakaEn, aiPlakaBoy) || 160);

              const plakaFiyatiEuro = String(s?.malzeme?.plakaFiyatiEuro || "");
              const kullanilanKur   = String(s?.malzeme?.kur || "53");
              const musteriAdi      = s?.musteri?.ad || s?.isBilgisi?.musteriAdi || "";
              const urunAdi         = s?.malzeme?.urunAdi || "";
              const musteriTipi     = s?.musteri?.tip === "yeni" ? "Ev sahibi" : (s?.musteri?.musteriTipi || "Ev sahibi");

              setForm((prev) => ({
                ...prev,
                musteriAdi:      musteriAdi || prev.musteriAdi,
                musteriId:       "",  // yeni müşteri olarak işaretle
                musteriTipi:     musteriTipi,
                urunAdi:         urunAdi || prev.urunAdi,
                plakaFiyatiEuro: plakaFiyatiEuro || prev.plakaFiyatiEuro,
                plakaFiyati:     "",  // euro girince TL'yi sıfırla
                kullanilanKur:   kullanilanKur,
                plakaEn,
                plakaBoy,
                parcalar:        parcalar.length > 0 ? parcalar : prev.parcalar,
                plakaLayoutJson: data?.plakaLayoutJson || prev.plakaLayoutJson,
                plakaImageUrl:   data?.plakaImageUrl   || prev.plakaImageUrl,
              }));
              setAktifAdim("musteri"); // müşteri adımına dön, kullanıcı kontrol etsin
              setAiMode(false);
            }}
            onManual={() => setAiMode(false)}
          />
          <button onClick={() => setAiMode(false)} style={{ marginTop: "12px", width: "100%", padding: "13px", background: "transparent", border: "1px solid #374151", borderRadius: "14px", color: "#9ca3af", fontSize: "14px", cursor: "pointer" }}>
            Manuel giriş →
          </button>
        </div>
      </div>
    );
  }

  // ─── BAŞARI EKRANI ─────────────────────────────────────────────────────────
  if (basariEkrani) {
    const karar = hesap.karYuzde >= 60 ? { renk: "#6ee7b7", baslik: "Premium fiyat 💪" }
      : hesap.karYuzde >= 35 ? { renk: "#93c5fd", baslik: "Sağlıklı fiyat ✓" }
      : hesap.karYuzde >= 20 ? { renk: "#fcd34d", baslik: "Dikkatli fiyat ⚠️" }
      : { renk: "#f87171", baslik: "Riskli fiyat 🔴" };

    return (
      <div style={{ minHeight: "100vh", background: "#030712", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 14px" }}>✓</div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.25em", color: "#10b981", textTransform: "uppercase", marginBottom: "6px" }}>İş Kaydedildi</p>
            <h1 style={{ fontSize: "26px", fontWeight: 900, margin: "0 0 6px" }}>Teklif Hazır!</h1>
            {sonTeklifNo && <p style={{ color: "#6b7280", fontSize: "13px" }}>#{sonTeklifNo}</p>}
            {yeniMusteri && <p style={{ marginTop: "8px", fontSize: "13px", color: "#93c5fd" }}>👤 {form.musteriAdi} müşteri listesine eklendi</p>}
          </div>

          {/* Ana rakamlar */}
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "20px", padding: "20px", textAlign: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Teklif Tutarı</p>
            <p style={{ fontSize: "38px", fontWeight: 900, color: "#10b981" }}>{tl(hesap.satisFiyati)}</p>
            <p style={{ fontSize: "13px", color: karar.renk, marginTop: "4px", fontWeight: 600 }}>{karar.baslik} · %{hesap.karYuzde.toFixed(0)} kâr</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            {[
              { l: "Kâr",       v: tl(hesap.kar),                         c: "#fbbf24" },
              { l: "Birim",     v: tl(hesap.birimFiyat) + "/mtül",        c: "#f9fafb" },
              { l: "Plaka",     v: hesap.plakaSayisi + " adet",           c: "#f9fafb" },
              { l: "Maliyet",   v: tl(hesap.toplamMaliyet),               c: "#f9fafb" },
              { l: "Mtül",      v: hesap.toplamMtul.toFixed(2) + " mtül", c: "#f9fafb" },
              { l: "Süre",      v: hesap.toplamDakika.toFixed(0) + " dk", c: "#f9fafb" },
            ].map((k) => (
              <div key={k.l} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "14px", padding: "12px 10px", textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px" }}>{k.l}</p>
                <p style={{ fontSize: "13px", fontWeight: 800, color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={whatsappGonder} style={{ width: "100%", padding: "15px", background: "#16a34a", border: "none", borderRadius: "14px", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: "pointer" }}>📲 WhatsApp ile Gönder</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button onClick={pdfAc}       style={{ padding: "13px", background: "#1d4ed8", border: "none", borderRadius: "14px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>📄 PDF</button>
              <button onClick={tahsilatAc}  style={{ padding: "13px", background: "#7c3aed", border: "none", borderRadius: "14px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>💳 Tahsilat</button>
            </div>
            <button onClick={linkKopyala}   style={{ padding: "13px", background: "#1f2937", border: "1px solid #374151", borderRadius: "14px", color: "#d1d5db", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>🔗 Teklif Linkini Kopyala</button>
            <button onClick={() => router.push("/dashboard/isler")} style={{ padding: "13px", background: "transparent", border: "1px solid #374151", borderRadius: "14px", color: "#9ca3af", fontSize: "14px", cursor: "pointer" }}>İşlere Dön</button>
            <button onClick={() => { setBasariEkrani(false); setAktifAdim("musteri"); setForm(defaultForm()); }} style={{ padding: "13px", background: "transparent", border: "1px dashed #374151", borderRadius: "14px", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}>+ Yeni İş</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── WIZARD ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[100dvh] bg-[#030712] text-white md:h-screen md:overflow-hidden md:flex md:flex-col">
      <style>{`
        .plaka-v2-fix input,.plaka-v2-fix select,.plaka-v2-fix textarea{color:#0f172a!important;background:#ffffff!important;-webkit-text-fill-color:#0f172a!important;}
        .plaka-v2-fix option{color:#0f172a!important;background:#ffffff!important;}
        .yi-inp{width:100%;box-sizing:border-box;background:#111827;border:1.5px solid #1f2937;border-radius:12px;padding:10px 13px;color:#f9fafb;font-size:15px;outline:none;transition:border-color .15s;-webkit-appearance:none;}
        .yi-inp:focus{border-color:#10b981;}
        .yi-inp::placeholder{color:#4b5563;}
        .yi-sel{width:100%;box-sizing:border-box;background:#111827;border:1.5px solid #1f2937;border-radius:12px;padding:10px 13px;color:#f9fafb;font-size:14px;outline:none;}
        .yi-sel:focus{border-color:#10b981;}
        .yi-label{font-size:11px;color:#6b7280;margin-bottom:5px;display:block;}
        .yi-kart{background:#0a0f1a;border:1px solid #1f2937;border-radius:20px;padding:18px;}
        .ikon-grid{display:grid;gap:8px;}
        .ikon-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 6px;border-radius:14px;border:1.5px solid #1f2937;background:#111827;color:#9ca3af;cursor:pointer;transition:all .15s;text-align:center;font-size:11px;line-height:1.3;}
        .ikon-btn:hover{border-color:#374151;background:#1f2937;color:#d1d5db;}
        .ikon-btn.aktif{border-color:#10b981;background:rgba(16,185,129,0.1);color:#10b981;}
        .parca-row{display:grid;gap:6px;align-items:end;padding:10px;border-radius:12px;background:#0d1117;border:1px solid #1f2937;margin-bottom:6px;}
        .olcu-parca-row{background:#0d1117;border:1px solid #1f2937;border-radius:14px;padding:12px;margin-bottom:8px;}
        .olcu-name-cell{display:flex;gap:8px;align-items:center;margin-bottom:10px;}
        .olcu-shape-cell{margin-bottom:8px;}
        .olcu-fields-grid{display:grid;grid-template-columns:1fr 1fr 80px;gap:8px;margin-bottom:8px;}
        .olcu-field-label{font-size:10px;color:#6b7280;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;}
        .olcu-field-input{font-size:15px!important;padding:9px 12px!important;font-weight:700;}
        .shape-meta-row{margin-top:8px;}
        .shape-helper{font-size:10px;color:#6b7280;line-height:1.35;}
        .shape-note-input{margin-top:6px;}
        .onalin-row{display:flex;align-items:center;gap:8px;margin-top:8px;}
        .onalin-chip{flex:1;padding:8px 12px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;}
        .onalin-box{width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
        .mtul-badge{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:8px 12px;font-size:12px;color:#10b981;font-weight:900;white-space:nowrap;flex-shrink:0;}
        .parca-del{width:36px;height:36px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#ef4444;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ek-is-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
        .ek-is-item{}
        .ek-is-note{font-size:10px;color:#6b7280;margin-top:4px;}
        .plaka-price-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .plaka-euro-row{display:flex;gap:6px;align-items:flex-end;}
        @media(max-width:640px){
          .desktop-sidebar{display:none!important;}
          .parca-row{grid-template-columns:1fr 1fr!important;}
          .parca-row .parca-ad-col{grid-column:1/-1;}
          .mobile-gizle{display:none!important;}
          .musteri-tipi-grid{grid-template-columns:repeat(3,1fr)!important;}
        }
        @media(min-width:641px){
          .mobile-only{display:none!important;}
          .olcu-parca-row{width:100%;max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) 92px 62px 72px 46px 86px 68px 28px;gap:6px;align-items:end;padding:8px;border-radius:12px;margin-bottom:6px;background:rgba(13,17,23,.82);}
          .olcu-parca-row>*{min-width:0;}
          .olcu-name-cell{margin-bottom:0;align-items:flex-end;}
          .olcu-name-cell .yi-inp{height:34px;min-width:0;}
          .olcu-shape-cell{margin-bottom:0;}
          .olcu-shape-cell .yi-sel{height:34px;min-width:0;font-size:11px!important;padding:7px 6px!important;border-radius:10px!important;}
          .olcu-fields-grid{display:contents;}
          .olcu-field-label{font-size:9px;margin-bottom:3px;letter-spacing:.08em;}
          .olcu-field-input{height:34px;min-width:0;font-size:13px!important;padding:7px 8px!important;border-radius:10px!important;}
          .shape-meta-row{grid-column:1/-1;margin-top:-1px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:center;}
          .shape-note-input{height:32px;font-size:12px!important;padding:6px 9px!important;border-radius:10px!important;margin-top:0;}
          .onalin-row{display:contents;margin-top:0;}
          .onalin-chip{height:34px;min-width:0;justify-content:center;padding:0 6px;border-radius:999px;font-size:10px;white-space:nowrap;align-self:end;gap:4px;overflow:hidden;}
          .onalin-box{width:12px;height:12px;border-radius:999px;font-size:8px;}
          .mtul-badge{height:34px;min-width:0;display:flex;align-items:center;justify-content:center;padding:0 5px;border-radius:999px;font-size:10px;align-self:end;overflow:hidden;text-overflow:ellipsis;}
          .parca-del{width:28px;height:34px;border-radius:9px;font-size:15px;align-self:end;}
          .on-alin-summary{width:100%;max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box;grid-template-columns:minmax(0,1fr) 92px 62px 72px 46px 86px 68px 28px!important;gap:6px!important;align-items:end!important;padding:7px 8px!important;border-radius:12px!important;background:rgba(251,191,36,.045)!important;}
          .on-alin-summary .yi-inp{height:32px;font-size:12px!important;padding:6px 8px!important;border-radius:10px!important;}
          .on-alin-summary-cell{height:32px;display:flex;align-items:center;justify-content:center;padding:0 8px!important;border-radius:10px!important;font-size:12px!important;}
          .on-alin-summary-label{height:32px;display:flex;align-items:center;font-size:11px!important;}
          .on-alin-summary-mtul{height:32px;display:flex;align-items:center;justify-content:center;font-size:11px!important;text-align:center!important;}
          .ek-is-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;align-items:stretch;}
          .ek-is-item{min-height:86px;background:rgba(13,17,23,.72);border:1px solid #1f2937;border-radius:12px;padding:8px;display:flex;flex-direction:column;justify-content:flex-start;}
          .ek-is-item .yi-label{min-height:24px;margin-bottom:4px;line-height:1.15;}
          .ek-is-item .yi-inp{height:34px;font-size:13px!important;padding:7px 9px!important;border-radius:10px!important;}
          .ek-is-note{font-size:9px;line-height:1.2;margin-top:5px;min-height:22px;}
          .plaka-price-grid{align-items:end;}
          .plaka-price-grid .yi-inp{height:36px;font-size:13px!important;padding:8px 10px!important;border-radius:10px!important;}
          .plaka-euro-row{align-items:flex-end;}
          .plaka-euro-main{display:flex;flex-direction:column;justify-content:flex-end;flex:1;}
          .plaka-kur-cell{width:80px;flex-shrink:0;display:flex;flex-direction:column;justify-content:flex-end;}
          .plaka-kur-cell .yi-label{white-space:nowrap;}
        }
      `}</style>

      {/* Desktop top strip */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-slate-800 bg-[#030712] px-4 py-2">
        <YiChip label="Yeni İş" value={adimlar[aktifIdx].label} />
        <YiChip label="Müşteri" value={form.musteriAdi || "—"} />
        <YiChip label="Mtül" value={hesap.toplamMtul > 0 ? `${hesap.toplamMtul.toFixed(2)} mtül` : "—"} />
        <YiChip label="Teklif" value={hesap.satisFiyati > 0 ? tl(hesap.satisFiyati) : "—"} tone="text-emerald-400" />
        <YiChip label="Kâr" value={hesap.kar > 0 ? tl(hesap.kar) : "—"} tone="text-amber-300" />
        <YiChip label="Plaka" value={hesap.plakaSayisi > 0 ? `${hesap.plakaSayisi} adet` : "—"} />
        <YiChip label="Taslak" value={taslakKaydedildi ? "Kaydedildi" : "Hazır"} tone={taslakKaydedildi ? "text-emerald-400" : "text-slate-400"} />
      </div>

      <div className="md:flex-1 md:min-h-0 md:overflow-hidden md:flex">

      {/* Sidebar — masaüstü */}
      <aside className="desktop-sidebar" style={{ width: "210px", borderRight: "1px solid #1f2937", display: "flex", flexDirection: "column", flexShrink: 0, background: "#030712" }}>
        <div style={{ padding: "22px 18px", borderBottom: "1px solid #1f2937" }}>
          <h1 style={{ fontSize: "19px", fontWeight: 900 }}>Yeni İş</h1>
          {taslakKaydedildi && <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "4px" }}>Taslak ✓</p>}
        </div>
        {/* Canlı özet */}
        <div style={{ marginTop: "auto", padding: "14px", borderTop: "1px solid #1f2937" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#4b5563", marginBottom: "8px" }}>Canlı Özet</p>
          {[
            { l: "Teklif",  v: hesap.satisFiyati  > 0 ? tl(hesap.satisFiyati)                  : "—", c: "#10b981" },
            { l: "Maliyet", v: hesap.toplamMaliyet > 0 ? tl(hesap.toplamMaliyet)                 : "—", c: "#f9fafb" },
            { l: "Kâr",    v: hesap.kar           > 0 ? tl(hesap.kar)                           : "—", c: "#fbbf24" },
            { l: "Kâr %",  v: hesap.toplamMaliyet > 0 ? `%${hesap.karYuzde.toFixed(1)}`         : "—",
              c: hesap.toplamMaliyet === 0 ? "#6b7280" : hesap.karYuzde >= 60 ? "#6ee7b7" : hesap.karYuzde >= 35 ? "#93c5fd" : hesap.karYuzde >= 20 ? "#fbbf24" : "#f87171" },
            { l: "Mtül",   v: hesap.toplamMtul    > 0 ? `${hesap.toplamMtul.toFixed(2)} mtül`   : "—", c: "#f9fafb" },
            { l: "Plaka",  v: hesap.plakaSayisi   > 0 ? `${hesap.plakaSayisi} adet`             : "—", c: "#f9fafb" },
          ].map((s) => (
            <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0d1117" }}>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>{s.l}</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #1f2937" }}>
          <button onClick={() => router.push("/dashboard/isler")} style={{ width: "100%", padding: "9px", background: "#0d1117", border: "1px solid #1f2937", borderRadius: "11px", color: "#9ca3af", fontSize: "12px", cursor: "pointer" }}>← İşlere Dön</button>
        </div>
      </aside>

      {/* Ana içerik */}
      <main ref={mainRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 1100, background: "rgba(3,7,18,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid #1f2937" }}>
          <div className="mobile-only" style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: "16px", fontWeight: 900 }}>{adimlar[aktifIdx].label}</h1>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>{aktifIdx + 1}/{adimlar.length}</span>
          </div>
          <div style={{ padding: "10px 16px 12px", display: "flex", gap: "6px" }}>
            {adimlar.map((a, i) => {
              const tam = i < aktifIdx; const aktif = a.id === aktifAdim;
              return (
                <button key={a.id} onClick={() => setAktifAdim(a.id)} style={{ flex: 1, padding: "7px 4px", borderRadius: "11px", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: aktif ? "#10b981" : tam ? "rgba(16,185,129,0.1)" : "#0d1117", border: aktif ? "1px solid #10b981" : tam ? "1px solid rgba(16,185,129,0.3)" : "1px solid #1f2937", color: aktif ? "#fff" : tam ? "#6ee7b7" : "#6b7280" }}>
                  <div>{tam ? "✓" : i + 1}</div>
                  <div style={{ marginTop: "2px" }}>{a.kisa}</div>
                </button>
              );
            })}
          </div>
          <div style={{ height: "2px", background: "#1f2937", margin: "0 16px 0" }}>
            <div style={{ height: "2px", background: "#10b981", width: `${((aktifIdx + 1) / adimlar.length) * 100}%`, transition: "width .4s" }} />
          </div>
        </div>

        {/* İçerik */}
        <div style={{ flex: 1, padding: "20px 16px 120px", maxWidth: "700px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* ══ ADIM 1: Müşteri & İş ══ */}
          {aktifAdim === "musteri" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Müşteri */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>👤 Müşteri</p>
                <div style={{ position: "relative" }}>
                  <input className="yi-inp" placeholder="Müşteri ara veya yaz..." value={form.musteriId ? form.musteriAdi : musteriArama}
                    onFocus={() => setMusteriListeAcik(true)}
                    onChange={(e) => { setMusteriArama(e.target.value); setAlan("musteriId", ""); setAlan("musteriAdi", e.target.value); setMusteriListeAcik(true); }} />
                  {form.musteriId && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px", padding: "8px 12px" }}>
                      <span style={{ color: "#10b981" }}>✓</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#6ee7b7", flex: 1 }}>{form.musteriAdi}</span>
                      <button onClick={() => { setAlan("musteriId", ""); setAlan("musteriAdi", ""); setMusteriArama(""); }} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
                    </div>
                  )}
                  {musteriListeAcik && !form.musteriId && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "#111827", border: "1px solid #374151", borderRadius: "14px", overflow: "hidden", zIndex: 50, maxHeight: "200px", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
                      {filtreli.slice(0, 8).map((m) => (
                        <button key={m.id} onClick={() => musteriSecVeCarpanOner(m)} style={{ width: "100%", padding: "11px 14px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #1f2937", cursor: "pointer", color: "#f9fafb" }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#1f2937")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ fontSize: "14px", fontWeight: 600 }}>{m.ad}</div>
                          {(m.telefon || m.email) && <div style={{ fontSize: "11px", color: "#6b7280" }}>{m.telefon || m.email}</div>}
                        </button>
                      ))}
                      {form.musteriAdi.trim() && (
                        <button onClick={() => setMusteriListeAcik(false)} style={{ width: "100%", padding: "11px 14px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "#10b981", fontSize: "13px" }}>
                          + "{form.musteriAdi}" yeni müşteri olarak kullan
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Müşteri tipi */}
                <div style={{ marginTop: "12px" }}>
                  <span className="yi-label">Müşteri Tipi</span>
                  <div className="ikon-grid musteri-tipi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
                    {MUSTERI_TIPLERI.map((t) => (
                      <button key={t.id} onClick={() => { setAlan("musteriTipi", t.id); setAlan("carpan", t.carpan); }} className={`ikon-btn${form.musteriTipi === t.id ? " aktif" : ""}`}>
                        <span style={{ fontSize: "20px" }}>{t.ikon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* İş bilgisi */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>📋 İş Bilgisi</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <span className="yi-label">Taş / Ürün Adı</span>
                    <input className="yi-inp" placeholder="Calacatta Gold" value={form.urunAdi} onChange={(e) => setAlan("urunAdi", e.target.value)} />
                  </div>
                  <div>
                    <span className="yi-label">İş Tarihi</span>
                    <input type="date" className="yi-inp" value={form.isTarihi} onChange={(e) => setAlan("isTarihi", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* İş modeli */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>⚙️ İş Modeli</p>
                <div className="ikon-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {IS_MODELLERI.map((m) => (
                    <button key={m.id} onClick={() => setAlan("isModeli", m.id)} className={`ikon-btn${form.isModeli === m.id ? " aktif" : ""}`} style={{ padding: "12px 8px" }}>
                      <span style={{ fontSize: "22px" }}>{m.ikon}</span>
                      <span style={{ fontWeight: 700 }}>{m.label}</span>
                      <span style={{ fontSize: "10px", opacity: 0.7, lineHeight: 1.2 }}>{m.aciklama}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mutfak tipi */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>🏠 Mutfak / Uygulama Tipi</p>
                <div className="ikon-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {MUTFAK_TIPLERI.map((t) => (
                    <button key={t.id} onClick={() => mutfakTipiDegistir(t.id)} className={`ikon-btn${form.mutfakTipi === t.id ? " aktif" : ""}`} style={{ padding: "12px 8px", gap: "6px" }}>
                      <div style={{ width: "56px", height: "40px", color: form.mutfakTipi === t.id ? "#10b981" : "#4b5563" }} dangerouslySetInnerHTML={{ __html: t.svg }} />
                      <span style={{ fontWeight: 700 }}>{t.label}</span>
                      <span style={{ fontSize: "10px", opacity: 0.6 }}>{t.aciklama}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }} className="desktop-sidebar">
                <button onClick={() => sonraki && setAktifAdim(sonraki)} style={{ padding: "13px 32px", background: "#10b981", border: "none", borderRadius: "14px", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: "pointer" }}>İleri →</button>
              </div>
            </div>
          )}

          {/* ══ ADIM 2: Ölçüler ══ */}
          {aktifAdim === "olculer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Parça girişi */}
              <div className="yi-kart">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700 }}>📐 Kesim Parçaları</p>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Toplam: <strong style={{ color: "#10b981" }}>{hesap.toplamMtul.toFixed(2)} mtül</strong></span>
                  </div>
                </div>



                {form.parcalar.map((p) => {
                  const olcuMetni = sekilOlcuMetni(p.sekilTipi);
                  return (
                    <div key={p.id} className="olcu-parca-row">
                      {/* Parça adı + sil */}
                      <div className="olcu-name-cell">
                        <input className="yi-inp olcu-field-input" style={{ flex: 1 }} value={p.ad} onChange={(e) => parcaGuncelle(p.id, "ad", e.target.value)} placeholder="Parça adı" />
                      </div>
                      <div className="olcu-shape-cell">
                        <div className="olcu-field-label">Şekil</div>
                        <select className="yi-sel" value={p.sekilTipi || "dikdortgen"} onChange={(e) => parcaGuncelle(p.id, "sekilTipi", e.target.value as SekilTipi)}>
                          {SEKIL_TIPLERI.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      {/* En / Boy / Adet */}
                      <div className="olcu-fields-grid">
                        <div>
                          <div className="olcu-field-label">{olcuMetni.enLabel}</div>
                          <input className="yi-inp olcu-field-input" type="text" inputMode="decimal" placeholder={olcuMetni.enPlaceholder} value={p.en} onChange={(e) => parcaGuncelleVeHesapla(p.id, "en", e.target.value)} />
                        </div>
                        <div>
                          <div className="olcu-field-label">{olcuMetni.boyLabel}</div>
                          <input className="yi-inp olcu-field-input" type="text" inputMode="decimal" placeholder={olcuMetni.boyPlaceholder} value={p.boy} onChange={(e) => parcaGuncelleVeHesapla(p.id, "boy", e.target.value)} />
                        </div>
                        <div>
                          <div className="olcu-field-label">Adet</div>
                          <input className="yi-inp olcu-field-input" type="text" inputMode="decimal" placeholder="1" value={p.adet} onChange={(e) => parcaGuncelleVeHesapla(p.id, "adet", e.target.value)} />
                        </div>
                      </div>
                      {/* Ön alın toggle */}
                      <div className="onalin-row">
                        <button onClick={() => parcaGuncelleVeHesapla(p.id, "onAlin", !p.onAlin)} className="onalin-chip" style={{ border: p.onAlin ? "1.5px solid #10b981" : "1.5px solid #1f2937", background: p.onAlin ? "rgba(16,185,129,0.1)" : "transparent", color: p.onAlin ? "#10b981" : "#6b7280" }}>
                          <span className="onalin-box" style={{ background: p.onAlin ? "#10b981" : "#1f2937" }}>{p.onAlin ? "✓" : ""}</span>
                          Ön alın var
                        </button>
                        {n(p.boy) > 0 && n(p.adet) > 0 && (
                          <div className="mtul-badge">
                            {((n(p.boy) / 100) * (n(p.adet) || 1)).toFixed(2)} mtül
                          </div>
                        )}
                        <button onClick={() => parcaSil(p.id)} className="parca-del">×</button>
                      </div>
                      {olcuMetni.helper && (
                        <div className="shape-meta-row">
                          <div className="shape-helper">{olcuMetni.helper}</div>
                          {olcuMetni.notGoster && (
                            <input
                              className="yi-inp shape-note-input"
                              placeholder="Örn: müşteri çizimine göre özel form"
                              value={p.shapeNotu || ""}
                              onChange={(e) => parcaGuncelle(p.id, "shapeNotu", e.target.value)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ÖN ALIN TOPLAM SATIRI — ön alın seçili parça varsa göster */}
                {(() => {
                  const oaParcalar = form.parcalar.filter((p) => p.onAlin);
                  if (oaParcalar.length === 0) return null;
                  const toplamBoy = oaParcalar.reduce((acc, p) => acc + n(p.boy) * (n(p.adet) || 1), 0);
                  const toplamAdet = oaParcalar.reduce((acc, p) => acc + (n(p.adet) || 1), 0);
                  const toplamMtul = toplamBoy / 100;
                  const oaEn = form.onAlinEnOverride?.["toplam"] ?? "4";
                  return (
                    <div className="on-alin-summary" style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px 50px 24px", gap: "6px", alignItems: "center", padding: "10px 12px", background: "rgba(251,191,36,0.07)", borderRadius: "12px", border: "1px solid rgba(251,191,36,0.25)", marginTop: "4px" }}>
                      <div className="on-alin-summary-label" style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 700 }}>↳ Ön Alın (otomatik)</div>
                      <input
                        className="yi-inp"
                        style={{ fontSize: "13px", padding: "8px 10px", borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.05)", color: "#fbbf24" }}
                        type="text" inputMode="decimal" value={oaEn}
                        onChange={(e) => setForm((prev) => ({ ...prev, onAlinEnOverride: { ...(prev.onAlinEnOverride || {}), toplam: e.target.value } }))}
                      />
                      <div className="on-alin-summary-cell" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "10px", padding: "8px 10px", fontSize: "13px", color: "#fbbf24", textAlign: "center", fontWeight: 700 }}>{toplamBoy}</div>
                      <div className="on-alin-summary-cell" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "10px", padding: "8px 10px", fontSize: "13px", color: "#fbbf24", textAlign: "center", fontWeight: 700 }}>{toplamAdet}</div>
                      <div className="on-alin-summary-mtul" style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 900, textAlign: "center" }}>{toplamMtul.toFixed(2)} mtül</div>
                      <div />
                    </div>
                  );
                })()}

                <button onClick={parcaEkle} style={{ marginTop: "8px", width: "100%", padding: "10px", background: "transparent", border: "1px dashed #374151", borderRadius: "12px", color: "#10b981", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                  + Parça Ekle
                </button>

                {hesap.toplamMtul > 0 && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div style={{ background: "#0d1117", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "10px", color: "#6b7280" }}>Toplam Mtül</p>
                      <p style={{ fontSize: "16px", fontWeight: 900, color: "#10b981" }}>{hesap.toplamMtul.toFixed(2)}</p>
                    </div>
                    <div style={{ background: "#0d1117", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "10px", color: "#6b7280" }}>Alan (m²)</p>
                      <p style={{ fontSize: "16px", fontWeight: 900 }}>{(hesap.toplamParcaAlani / 10000).toFixed(2)}</p>
                    </div>
                    <div style={{ background: "#0d1117", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "10px", color: "#6b7280" }}>Tahmini Plaka</p>
                      <p style={{ fontSize: "16px", fontWeight: 900, color: "#fbbf24" }}>{hesap.plakaSayisi} adet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Ek işler */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>🔧 Ek İşler</p>
                <div className="ek-is-grid">
                  <div className="ek-is-item">
                    <span className="yi-label">Eviye deliği</span>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.eviyes} onChange={(e) => setAlan("eviyes", e.target.value)} />
                  </div>
                  <div className="ek-is-item">
                    <span className="yi-label">Ocak deliği</span>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.ocaklar} onChange={(e) => setAlan("ocaklar", e.target.value)} />
                  </div>
                  <div className="ek-is-item">
                    <span className="yi-label">Priz / delik</span>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.prizler} onChange={(e) => setAlan("prizler", e.target.value)} />
                  </div>
                  <div className="ek-is-item">
                    <span className="yi-label">İlave Pahlama (mtül)</span>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.pahlamaMtul} onChange={(e) => setAlan("pahlamaMtul", e.target.value)} />
                    <p className="ek-is-note">
                      Otomatik {hesap.autoPahlamaMtul.toFixed(2)} + İlave {hesap.manualPahlamaMtul.toFixed(2)} = {hesap.effectivePahlamaMtul.toFixed(2)} mtül
                    </p>
                  </div>
                  <div className="ek-is-item">
                    <span className="yi-label">İlave 45° Kesim (mtül)</span>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.kesim45Mtul} onChange={(e) => setAlan("kesim45Mtul", e.target.value)} />
                    <p className="ek-is-note">
                      Otomatik {hesap.autoKesim45Mtul.toFixed(2)} + İlave {hesap.manualKesim45Mtul.toFixed(2)} = {hesap.effectiveKesim45Mtul.toFixed(2)} mtül
                    </p>
                  </div>
                </div>
              </div>

              {/* Plaka bilgisi — sadece "tam" modda */}
              {form.isModeli === "tam" && (
                <div className="yi-kart">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700 }}>🪨 Plaka Bilgisi</p>
                    <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={plakaHesapla} disabled={plakaHesaplaniyor} style={{ padding: "7px 14px", background: plakaHesaplaniyor ? "#374151" : "#10b981", border: "none", borderRadius: "10px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: plakaHesaplaniyor ? "not-allowed" : "pointer" }}>
                      {plakaHesaplaniyor ? "⏳ Hesaplanıyor..." : "🧮 Plaka Hesapla"}
                    </button>
                    <button onClick={() => {
                      const rows: any[] = [];
                      form.parcalar.forEach((p) => {
                        const en = n(p.en), boy = n(p.boy), adet = Math.max(1, n(p.adet) || 1);
                        if (en <= 0 || boy <= 0) return;
                        const oaEn = n(form.onAlinEnOverride?.['toplam']) || 4;
                        for (let i = 0; i < adet; i++) {
                          if (p.onAlin) {
                            rows.push({ parcaTuru: p.ad + ' Ön Alın', uzunluk: String(boy), genislik: String(oaEn), sureDakika: '8', sekilTipi: 'dikdortgen' });
                          }
                          rows.push({ parcaTuru: p.ad, uzunluk: String(boy), genislik: String(en), sureDakika: String(n(form.tezgahDakika) || 25), sekilTipi: p.sekilTipi || 'dikdortgen', shapeNotu: p.shapeNotu });
                        }
                      });
                      setPlakaInitialRows(rows);
                      setPlakaAcik(true);
                    }} style={{ padding: "7px 14px", background: "#1d4ed8", border: "none", borderRadius: "10px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                      📐 Görsel Planlayıcı
                    </button>
                  </div>
                  </div>
                  {form.plakaLayoutJson && (
                    <div style={{ marginBottom: "10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px", padding: "8px 12px", fontSize: "12px", color: "#6ee7b7" }}>
                      ✓ Plan aktarıldı — {hesap.plakaSayisi} plaka
                    </div>
                  )}
                  <div className="plaka-price-grid">
                    <div>
                      <span className="yi-label">Plaka Fiyatı (TL)</span>
                      <input className="yi-inp" type="text" inputMode="decimal" placeholder="0" value={form.plakaFiyati} onChange={(e) => setAlan("plakaFiyati", e.target.value)} />
                    </div>
                    <div>
                      <div className="plaka-euro-row">
                        <div className="plaka-euro-main">
                          <span className="yi-label">veya Euro fiyatı</span>
                          <input className="yi-inp" type="text" inputMode="decimal" placeholder="€" value={form.plakaFiyatiEuro} onChange={(e) => setAlan("plakaFiyatiEuro", e.target.value)} />
                        </div>
                        <div className="plaka-kur-cell">
                          <span className="yi-label">Euro Kuru</span>
                          <input className="yi-inp" type="text" inputMode="decimal" placeholder="Kur" value={form.kullanilanKur} onChange={(e) => setAlan("kullanilanKur", e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="yi-label">Plaka En (cm)</span>
                      <input className="yi-inp" type="text" inputMode="decimal" placeholder="160" value={form.plakaEn} onChange={(e) => setAlan("plakaEn", e.target.value)} />
                    </div>
                    <div>
                      <span className="yi-label">Plaka Boy (cm)</span>
                      <input className="yi-inp" type="text" inputMode="decimal" placeholder="320" value={form.plakaBoy} onChange={(e) => setAlan("plakaBoy", e.target.value)} />
                    </div>
                  </div>
                  {hesap.malzemeMaliyeti > 0 && (
                    <div style={{ marginTop: "12px", background: "#0d1117", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>{hesap.plakaSayisi} plaka × {tl(hesap.plakaFiyatiTl)}</span>
                      <span style={{ fontSize: "18px", fontWeight: 900, color: "#10b981" }}>{tl(hesap.malzemeMaliyeti)}</span>
                    </div>
                  )}

                  {/* Plaka hesap sonucu */}
                  {plakaPlakaSayisi > 0 && (
                    <div style={{ marginTop: "12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "14px", padding: "14px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "3px" }}>Gerekli Plaka</p>
                          <p style={{ fontSize: "24px", fontWeight: 900, color: "#10b981" }}>{plakaPlakaSayisi}</p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "3px" }}>Fire Oranı</p>
                          <p style={{ fontSize: "24px", fontWeight: 900, color: plakaFireOrani > 30 ? "#f87171" : "#fbbf24" }}>%{plakaFireOrani.toFixed(0)}</p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "3px" }}>Toplam Maliyet</p>
                          <p style={{ fontSize: "16px", fontWeight: 900, color: "#f9fafb" }}>{tl(plakaPlakaSayisi * n(form.plakaFiyati || "0"))}</p>
                        </div>
                      </div>

                      {/* Plaka görsel önizleme */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {plakaSlabs.slice(0, 8).map((slab: any, si: number) => {
                          const pEn  = n(form.plakaEn)  || 160;
                          const pBoy = n(form.plakaBoy) || 320;
                          const sc = 90 / pBoy;
                          const w = Math.round(pEn * sc);
                          const h = 90;
                          const RENKLER: Record<string, string> = {
                            "on_alin": "#fbbf24", "tezgah": "#10b981",
                            "tezgah_arasi": "#60a5fa", "ada_tezgah": "#a78bfa", "ada_ayak": "#f472b6",
                          };
                          const normalize = (s: string) => s.toLowerCase()
                            .replace(/\s+/g,"_").replace(/[ı]/g,"i").replace(/[ş]/g,"s")
                            .replace(/[ğ]/g,"g").replace(/[ü]/g,"u").replace(/[ö]/g,"o").replace(/[ç]/g,"c");
                          return (
                            <div key={si} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "9px", color: "#6b7280", marginBottom: "3px", fontWeight: 600 }}>Plaka {si+1}</div>
                              <svg width={w} height={h} style={{ background: "#0d1117", borderRadius: "6px", border: "1px solid #374151", display: "block" }}>
                                {slab.yerlesim?.map((p: any, pi: number) => {
                                  const k = normalize(String(p.parcaTuru || ""));
                                  const renk = RENKLER[k] || "#6b7280";
                                  const px = Math.round((p.x || 0) * sc);
                                  const py = Math.round((p.y || 0) * sc);
                                  const pw = Math.max(1, Math.round((p.genislik || 0) * sc));
                                  const ph = Math.max(1, Math.round((p.yukseklik || 0) * sc));
                                  return (
                                    <rect key={pi} x={px} y={py} width={pw} height={ph}
                                      fill={renk} opacity={0.8} stroke="#0d1117" strokeWidth={0.5}/>
                                  );
                                })}
                              </svg>
                              <div style={{ fontSize: "9px", color: "#4b5563", marginTop: "2px" }}>{slab.yerlesim?.length || 0} parça</div>
                            </div>
                          );
                        })}
                        {plakaSlabs.length > 8 && (
                          <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: "11px", color: "#6b7280" }}>+{plakaSlabs.length - 8} plaka</div>
                        )}
                      </div>

                      {/* Renk açıklaması */}
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                        {[["#fbbf24","Ön Alın"],["#10b981","Tezgah"],["#60a5fa","Tezgah Arası"],["#a78bfa","Diğer"]].map(([renk,ad]) => (
                          <div key={ad} style={{ display: "flex", alignItems: "center", gap: "5px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(15,23,42,0.72)", borderRadius: "999px", padding: "4px 8px" }}>
                            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: renk }}/>
                            <span style={{ fontSize: "10px", color: "#f8fafc", fontWeight: 800 }}>{ad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gelişmiş: makine/süre */}
              <div className="yi-kart">
                <button onClick={() => setGelismisAcik(!gelismisAcik)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  <span>⚙️ Gelişmiş (Makine & Süre)</span>
                  <span>{gelismisAcik ? "▲" : "▼"}</span>
                </button>
                {gelismisAcik && (
                  <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Tezgah dk/mtül",  dKey: "tezgahDakika",  mKey: "tezgahMakineId"  },
                      { label: "Pahlama dk/mtül",  dKey: "pahlamaDakika", mKey: "pahlamaMakineId" },
                      { label: "45° dk/mtül",      dKey: "kesim45Dakika", mKey: "kesim45MakineId" },
                    ].map((r) => (
                      <div key={r.label} style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignItems: "end" }}>
                        <div>
                          <span className="yi-label">{r.label}</span>
                          <input className="yi-inp" type="text" inputMode="decimal" value={(form as any)[r.dKey]} onChange={(e) => setAlan(r.dKey as any, e.target.value)} />
                        </div>
                        <div>
                          <span className="yi-label">Makine</span>
                          <select className="yi-sel" value={(form as any)[r.mKey]} onChange={(e) => setAlan(r.mKey as any, e.target.value)}>
                            {makineler.length === 0 && <option value="">Makine yok</option>}
                            {makineler.map((m: any) => <option key={m.id} value={m.id}>{m.makineAdi} · {Number(m.dakikalikMaliyet ?? m.dkMaliyet ?? 0).toFixed(0)}₺/dk</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }} className="desktop-sidebar">
                <button onClick={() => sonraki && setAktifAdim(sonraki)} style={{ padding: "13px 32px", background: "#10b981", border: "none", borderRadius: "14px", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: "pointer" }}>İleri →</button>
              </div>
            </div>
          )}

          {/* ══ ADIM 3: Fiyat & Kaydet ══ */}
          {aktifAdim === "fiyat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Canlı fiyat kartı */}
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "20px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Teklif Tutarı</p>
                    <p style={{ fontSize: "40px", fontWeight: 900, color: "#10b981", lineHeight: 1 }}>{tl(hesap.satisFiyati)}</p>
                    {hesap.toplamMtul > 0 && <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{tl(hesap.birimFiyat)} / mtül · {hesap.toplamMtul.toFixed(2)} mtül</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "#6b7280" }}>Kâr</p>
                    <p style={{ fontSize: "22px", fontWeight: 900, color: "#fbbf24" }}>{tl(hesap.kar)}</p>
                    <p style={{ fontSize: "13px", color: hesap.karYuzde >= 30 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>%{hesap.karYuzde.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              {/* Fiyatlandırma modu */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>💰 Fiyatlandırma</p>

                {/* Mod seçimi */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  <button onClick={() => setAlan("fiyatModu", "carpan")} style={{ padding: "10px", borderRadius: "12px", border: form.fiyatModu === "carpan" ? "2px solid #10b981" : "1.5px solid #1f2937", background: form.fiyatModu === "carpan" ? "rgba(16,185,129,0.1)" : "#111827", color: form.fiyatModu === "carpan" ? "#10b981" : "#9ca3af", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    ✕ Çarpan Modu
                  </button>
                  <button onClick={() => setAlan("fiyatModu", "kar")} style={{ padding: "10px", borderRadius: "12px", border: form.fiyatModu === "kar" ? "2px solid #10b981" : "1.5px solid #1f2937", background: form.fiyatModu === "kar" ? "rgba(16,185,129,0.1)" : "#111827", color: form.fiyatModu === "kar" ? "#10b981" : "#9ca3af", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    % Kâr Modu
                  </button>
                </div>

                {form.fiyatModu === "carpan" ? (
                  <div>
                    <span className="yi-label">Çarpan (Plaka maliyeti × çarpan = Satış)</span>
                    {/* Hızlı seçimler */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                      {["2.0","2.3","2.5","2.8","3.0","3.5"].map((c) => (
                        <button key={c} onClick={() => setAlan("carpan", c)} style={{ padding: "7px 14px", borderRadius: "100px", border: form.carpan === c ? "2px solid #10b981" : "1px solid #374151", background: form.carpan === c ? "rgba(16,185,129,0.1)" : "#111827", color: form.carpan === c ? "#10b981" : "#9ca3af", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                          ×{c}
                        </button>
                      ))}
                    </div>
                    <input className="yi-inp" type="text" inputMode="decimal" step="0.1" placeholder="3.0" value={form.carpan} onChange={(e) => setAlan("carpan", e.target.value)} />
                    {hesap.malzemeMaliyeti > 0 && (
                      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                        {tl(hesap.malzemeMaliyeti)} × {form.carpan} = {tl(hesap.satisFiyati)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="yi-label">Kâr Hedefi (%)</span>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                      {["20","25","30","40","50","60"].map((k) => (
                        <button key={k} onClick={() => setAlan("karHedefi", k)} style={{ padding: "7px 14px", borderRadius: "100px", border: form.karHedefi === k ? "2px solid #10b981" : "1px solid #374151", background: form.karHedefi === k ? "rgba(16,185,129,0.1)" : "#111827", color: form.karHedefi === k ? "#10b981" : "#9ca3af", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                          %{k}
                        </button>
                      ))}
                    </div>
                    <input className="yi-inp" type="text" inputMode="decimal" placeholder="30" value={form.karHedefi} onChange={(e) => setAlan("karHedefi", e.target.value)} />
                  </div>
                )}

                {/* Manuel birim fiyat override */}
                <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #1f2937" }}>
                  <span className="yi-label">Manuel Birim Fiyat Override (opsiyonel, ₺/mtül)</span>
                  <input className="yi-inp" type="text" inputMode="decimal" placeholder="Boş bırakırsan otomatik hesaplanır" value={form.manuelBirimFiyat} onChange={(e) => setAlan("manuelBirimFiyat", e.target.value)} />
                  {form.manuelBirimFiyat && n(form.manuelBirimFiyat) > 0 && (
                    <p style={{ fontSize: "12px", color: "#fbbf24", marginTop: "4px" }}>⚠️ Override aktif: {tl(n(form.manuelBirimFiyat))} × {hesap.toplamMtul.toFixed(2)} mtül = {tl(n(form.manuelBirimFiyat) * hesap.toplamMtul)}</p>
                  )}
                </div>
              </div>

              {/* Maliyet dökümü */}
              <div className="yi-kart">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>📊 Maliyet Dökümü</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { l: "Malzeme (Plaka)",     v: hesap.malzemeMaliyeti,   gizle: form.isModeli !== "tam" },
                    { l: "İşçilik",             v: hesap.iscilikMaliyeti,   gizle: false },
                    { l: "Toplam Maliyet",      v: hesap.toplamMaliyet,     gizle: false, kalin: true },
                    { l: "Satış Fiyatı",        v: hesap.satisFiyati,       gizle: false, kalin: true, yesil: true },
                    { l: "Kâr",                v: hesap.kar,               gizle: false, sari: true },
                  ].filter((s) => !s.gizle).map((s) => (
                    <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: s.kalin ? "#0d1117" : "transparent", borderRadius: "10px", borderTop: s.kalin ? "1px solid #1f2937" : "none" }}>
                      <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: s.kalin ? 700 : 400 }}>{s.l}</span>
                      <span style={{ fontSize: s.kalin ? "16px" : "14px", fontWeight: s.kalin ? 900 : 600, color: s.yesil ? "#10b981" : s.sari ? "#fbbf24" : "#f9fafb" }}>{tl(s.v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {laborV2Enabled && (
                <LaborV2PreviewPanel form={form} hesap={hesap} makineler={makineler} plakaFireOrani={plakaFireOrani} />
              )}

              {/* İş özeti */}
              <div className="yi-kart mobile-gizle">
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>📋 İş Özeti</p>
                {[
                  { l: "Müşteri",      v: form.musteriAdi || "—" },
                  { l: "Müşteri Tipi", v: form.musteriTipi },
                  { l: "Taş / Ürün",   v: form.urunAdi    || "—" },
                  { l: "İş Modeli",    v: IS_MODELLERI.find((m) => m.id === form.isModeli)?.label || form.isModeli },
                  { l: "Mutfak Tipi",  v: MUTFAK_TIPLERI.find((t) => t.id === form.mutfakTipi)?.label || form.mutfakTipi },
                  { l: "Toplam Mtül",  v: hesap.toplamMtul.toFixed(2) + " mtül" },
                  { l: "Plaka",        v: hesap.plakaSayisi + " adet" },
                  { l: "Üretim Süresi",v: hesap.toplamDakika.toFixed(0) + " dk" },
                ].map((s, i, arr) => (
                  <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #1f2937" : "none" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{s.l}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              {/* Kalem Bazlı Maliyet & Birim Fiyat Tablosu */}
              {hesap.toplamMtul > 0 && (
                <div className="yi-kart mobile-gizle">
                  <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>📐 Kalem Bazlı Birim Analiz</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1f2937" }}>
                          {["Kalem","Mtül","Maliyet/mtül","Satış/mtül","Toplam Satış"].map((h) => (
                            <th key={h} style={{ padding: "8px 6px", textAlign: h === "Kalem" ? "left" : "right", color: "#6b7280", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const satirlar: any[] = [];
                          const makineMaliyetFn = (id: string) => {
                            const m = makineler.find((x: any) => x.id === id);
                            return Number(m?.dakikalikMaliyet ?? m?.dkMaliyet ?? m?.dakikaMaliyet ?? m?.hesaplananDakikaMaliyeti ?? 0) || 106;
                          };
                          // Her parça için satır
                          form.parcalar.forEach((p) => {
                            const en = n(p.en), boy = n(p.boy), adet = n(p.adet) || 1;
                            if (en > 0 && boy > 0) {
                              const mtul = (boy / 100) * adet;
                              const maliyetDk = mtul * n(form.tezgahDakika || "25");
                              const maliyetTl = maliyetDk * makineMaliyetFn(form.tezgahMakineId);
                              const maliyetMtul = mtul > 0 ? maliyetTl / mtul : 0;
                              // Plaka maliyeti bu parçaya düşen pay
                              const plakaPayi = hesap.toplamParcaAlani > 0
                                ? (en * boy * adet / hesap.toplamParcaAlani) * hesap.malzemeMaliyeti
                                : 0;
                              const toplamMaliyetKalem = maliyetTl + plakaPayi;
                              const maliyetMtulTam = mtul > 0 ? toplamMaliyetKalem / mtul : 0;
                              const satisMtul = hesap.toplamMtul > 0 ? hesap.satisFiyati / hesap.toplamMtul : 0;
                              const toplamSatis = satisMtul * mtul;
                              satirlar.push({ ad: p.ad, mtul, maliyetMtul: maliyetMtulTam, satisMtul, toplamSatis });
                            }
                          });
                          // Ek işler
                          if (hesap.effectivePahlamaMtul > 0) {
                            const mtul = hesap.effectivePahlamaMtul;
                            const maliyetTl = mtul * n(form.pahlamaDakika || "1") * makineMaliyetFn(form.pahlamaMakineId);
                            satirlar.push({ ad: "Pahlama", mtul, maliyetMtul: mtul > 0 ? maliyetTl/mtul : 0, satisMtul: 0, toplamSatis: 0, ekIs: true });
                          }
                          if (hesap.effectiveKesim45Mtul > 0) {
                            const mtul = hesap.effectiveKesim45Mtul;
                            const maliyetTl = mtul * n(form.kesim45Dakika || "4") * makineMaliyetFn(form.kesim45MakineId);
                            satirlar.push({ ad: "45° Kesim", mtul, maliyetMtul: mtul > 0 ? maliyetTl/mtul : 0, satisMtul: 0, toplamSatis: 0, ekIs: true });
                          }
                          if (n(form.eviyes) > 0)  satirlar.push({ ad: `Eviye (${form.eviyes} ad)`,  mtul: 0, maliyetMtul: 0, satisMtul: 0, toplamSatis: 0, ekIs: true, sabit: n(form.eviyes)  * 200 * makineMaliyetFn(form.tezgahMakineId) });
                          if (n(form.ocaklar) > 0) satirlar.push({ ad: `Ocak (${form.ocaklar} ad)`,   mtul: 0, maliyetMtul: 0, satisMtul: 0, toplamSatis: 0, ekIs: true, sabit: n(form.ocaklar) * 150 * makineMaliyetFn(form.tezgahMakineId) });
                          if (n(form.prizler) > 0)  satirlar.push({ ad: `Priz/Delik (${form.prizler} ad)`, mtul: 0, maliyetMtul: 0, satisMtul: 0, toplamSatis: 0, ekIs: true, sabit: n(form.prizler) * 50 * makineMaliyetFn(form.tezgahMakineId) });
                          return satirlar.map((s, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #0d1117", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                              <td style={{ padding: "8px 6px", fontWeight: 600, color: s.ekIs ? "#9ca3af" : "#f9fafb" }}>
                                {s.ad}
                                {s.ekIs && <span style={{ marginLeft: "4px", fontSize: "10px", color: "#4b5563", background: "#1f2937", borderRadius: "4px", padding: "1px 4px" }}>Maliyete dahil</span>}
                              </td>
                              <td style={{ padding: "8px 6px", textAlign: "right", color: "#9ca3af" }}>{s.mtul > 0 ? s.mtul.toFixed(2) : "—"}</td>
                              <td style={{ padding: "8px 6px", textAlign: "right", color: "#fbbf24" }}>
                                {s.sabit ? tl(s.sabit) : s.maliyetMtul > 0 ? tl(s.maliyetMtul) + "/mtül" : "—"}
                              </td>
                              <td style={{ padding: "8px 6px", textAlign: "right", color: s.ekIs ? "#4b5563" : "#10b981" }}>
                                {s.satisMtul > 0 ? tl(s.satisMtul) + "/mtül" : s.ekIs ? "Dahil" : "—"}
                              </td>
                              <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: s.ekIs ? "#6b7280" : "#f9fafb" }}>
                                {s.toplamSatis > 0 ? tl(s.toplamSatis) : s.sabit ? tl(s.sabit) : "—"}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #1f2937", background: "#0d1117" }}>
                          <td colSpan={2} style={{ padding: "10px 6px", fontWeight: 900, fontSize: "13px" }}>TOPLAM</td>
                          <td style={{ padding: "10px 6px", textAlign: "right", color: "#fbbf24", fontWeight: 700 }}>{tl(hesap.toplamMaliyet)}</td>
                          <td style={{ padding: "10px 6px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>{hesap.toplamMtul > 0 ? tl(hesap.satisFiyati / hesap.toplamMtul) + "/mtül" : "—"}</td>
                          <td style={{ padding: "10px 6px", textAlign: "right", color: "#10b981", fontWeight: 900, fontSize: "15px" }}>{tl(hesap.satisFiyati)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Notlar */}
              <div>
                <span className="yi-label">Notlar</span>
                <textarea className="yi-inp" style={{ height: "80px", resize: "none" }} placeholder="Özel notlar, müşteri talepleri..." value={form.notlar} onChange={(e) => setAlan("notlar", e.target.value)} />
              </div>

              {/* Kaydet butonu — masaüstünde görünür, mobilde sticky bar karşılığı */}
              <button onClick={kaydet} disabled={kaydediliyor} className="desktop-sidebar" style={{ width: "100%", padding: "18px", background: kaydediliyor ? "#374151" : "#10b981", border: "none", borderRadius: "16px", color: "#fff", fontSize: "17px", fontWeight: 900, cursor: kaydediliyor ? "not-allowed" : "pointer", boxShadow: kaydediliyor ? "none" : "0 8px 32px rgba(16,185,129,0.4)" }}>
                {kaydediliyor ? "Kaydediliyor..." : "✓ Hesapla & Kaydet"}
              </button>
            </div>
          )}

        </div>

        {/* Mobil alt çubuk */}
        <div className="mobile-only" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, padding: "10px 16px", paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)", background: "rgba(3,7,18,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid #1f2937", display: "flex", gap: "10px" }}>
          <button onClick={() => onceki ? setAktifAdim(onceki) : router.push("/dashboard/isler")} style={{ padding: "13px 12px", background: "#0d1117", border: "1px solid #374151", borderRadius: "13px", color: "#d1d5db", fontSize: "14px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            {onceki ? "← Geri" : "← Dön"}
          </button>
          {sonraki ? (
            <button onClick={() => setAktifAdim(sonraki)} style={{ flex: 1, padding: "13px", background: "#10b981", border: "none", borderRadius: "13px", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: "pointer" }}>
              İleri →
            </button>
          ) : (
            <button onClick={kaydet} disabled={kaydediliyor} style={{ flex: 1, padding: "13px", background: kaydediliyor ? "#374151" : "#10b981", border: "none", borderRadius: "13px", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: kaydediliyor ? "not-allowed" : "pointer" }}>
              {kaydediliyor ? "Kaydediliyor..." : "✓ Kaydet"}
            </button>
          )}
        </div>
      </main>
      </div>

      {/* Desktop bottom action bar */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-[#030712] px-4 py-3">
        <button onClick={() => router.push("/dashboard/isler")} style={{ padding: "10px 14px", background: "#0d1117", border: "1px solid #1f2937", borderRadius: "12px", color: "#d1d5db", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          ← İşlere Dön
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setAiMode(true)} style={{ padding: "10px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: "12px", color: "#6ee7b7", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
            ✨ AI
          </button>
          <button onClick={() => setPlakaAcik(true)} style={{ padding: "10px 16px", background: "rgba(29,78,216,0.18)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: "12px", color: "#bfdbfe", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
            📐 Planlayıcı
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => onceki && setAktifAdim(onceki)} disabled={!onceki} style={{ padding: "10px 14px", background: "#0d1117", border: "1px solid #1f2937", borderRadius: "12px", color: onceki ? "#d1d5db" : "#4b5563", fontSize: "13px", fontWeight: 700, cursor: onceki ? "pointer" : "not-allowed" }}>
            Önceki
          </button>
          <button onClick={() => sonraki && setAktifAdim(sonraki)} disabled={!sonraki} style={{ padding: "10px 14px", background: sonraki ? "#0d1117" : "#111827", border: "1px solid #1f2937", borderRadius: "12px", color: sonraki ? "#d1d5db" : "#4b5563", fontSize: "13px", fontWeight: 700, cursor: sonraki ? "pointer" : "not-allowed" }}>
            Sonraki
          </button>
          <button onClick={kaydet} disabled={kaydediliyor} style={{ padding: "10px 18px", background: kaydediliyor ? "#374151" : "#10b981", border: "none", borderRadius: "12px", color: "#fff", fontSize: "13px", fontWeight: 900, cursor: kaydediliyor ? "not-allowed" : "pointer" }}>
            {kaydediliyor ? "Kaydediliyor..." : duzenleId ? "Kaydet" : "Teklifi Kaydet"}
          </button>
        </div>
      </div>

      {/* ✨ Floating AI Bubble — mobil */}
      {!aiMode && !basariEkrani && (
        <button
          className="mobile-only"
          onClick={() => setAiMode(true)}
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom) + 96px)",
            right: "16px",
            zIndex: 1300,
            minWidth: "auto",
            height: "52px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
            boxShadow: "0 6px 24px rgba(16,185,129,0.45)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "0 16px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 900,
            transition: "transform .15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="AI ile doldur veya plan yükle"
        >
          <span style={{ fontSize: "19px", lineHeight: 1 }}>✨</span>
          <span style={{ whiteSpace: "nowrap" }}>AI / Plan Yükle</span>
        </button>
      )}

      {/* Plaka modal */}
      {plakaAcik && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPlakaAcik(false)}>
          <div className="plaka-v2-fix" style={{ height: "100dvh", width: "100%", overflowY: "auto", background: "#030712", padding: "16px", paddingTop: "60px", paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1f2937", paddingBottom: "12px", marginBottom: "16px", background: "rgba(3,7,18,0.97)", backdropFilter: "blur(20px)", paddingTop: "8px" }}>
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: 900, color: "#fff" }}>Plaka Planlayıcı</h2>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>Kesimler otomatik aktarılacak</p>
              </div>
              <button onClick={() => setPlakaAcik(false)} style={{ padding: "10px 18px", background: "#ef4444", border: "none", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>✕ Kapat</button>
            </div>
            <PlakaPlanlayiciV2 embedded
              initialProductName={form.urunAdi}
              initialPlakaGenislik={form.plakaEn}
              initialPlakaYukseklik={form.plakaBoy}
              initialPlakaFiyati={
                form.plakaFiyatiEuro
                  ? form.plakaFiyatiEuro
                  : n(form.plakaFiyati) > 0 && n(form.kullanilanKur) > 0
                    ? String((n(form.plakaFiyati) / n(form.kullanilanKur)).toFixed(2))
                    : ""
              }
              initialRows={plakaInitialRows}
              onApply={(sonuc: any) => {
                if (sonuc?.plakaLayoutJson) setAlan("plakaLayoutJson", sonuc.plakaLayoutJson);
                if (sonuc?.plakaImageUrl)  setAlan("plakaImageUrl",  sonuc.plakaImageUrl);
                if (sonuc?.ortalamaPlakaFiyati > 0) setAlan("plakaFiyatiEuro", String(Number(sonuc.ortalamaPlakaFiyati).toFixed(2)));
                // Parçaları değiştirme — sadece layout bilgisini aktar
                if (false) {
                  setForm((p) => {
                    const yeniParcalar = [...p.parcalar];
                    const tezgahIdx = yeniParcalar.findIndex((x) => x.tip === "tezgah");
                    if (tezgahIdx >= 0) {
                      yeniParcalar[tezgahIdx] = { ...yeniParcalar[tezgahIdx] };
                    }
                    return { ...p, parcalar: yeniParcalar };
                  });
                }
                setPlakaAcik(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
