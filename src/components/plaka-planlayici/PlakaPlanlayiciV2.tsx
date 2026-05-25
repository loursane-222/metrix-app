"use client";
import { useMemo, useRef, useState, useCallback } from "react";

// ─── Renk haritası ────────────────────────────────────────────────────────────
const KIND_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  on_alin:      { bg: "rgba(239,68,68,0.30)",   border: "#dc2626", text: "#fef2f2" },
  tezgah:       { bg: "rgba(59,130,246,0.30)",  border: "#2563eb", text: "#eff6ff" },
  tezgah_arasi: { bg: "rgba(16,185,129,0.30)",  border: "#059669", text: "#ecfdf5" },
  default:      { bg: "rgba(124,58,237,0.25)",  border: "#7c3aed", text: "#f5f3ff" },
};

function kindColor(parcaTuru?: string) {
  const t = String(parcaTuru || "").toLowerCase().replace(/\s/g,"_");
  if (t.includes("on_alin") || t.includes("ön_alın") || t === "on_alin") return KIND_COLOR.on_alin;
  if (t.includes("tezgah_arasi") || t.includes("tezgah_arası")) return KIND_COLOR.tezgah_arasi;
  if (t.includes("tezgah")) return KIND_COLOR.tezgah;
  return KIND_COLOR.default;
}

function num(v: string | number | undefined) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ─── Tipler ───────────────────────────────────────────────────────────────────
type SekilTipi = "dikdortgen" | "oval" | "kapsul" | "l_parca" | "ozel_sablon";

type KesimRow = {
  parcaTuru: string;    // Gerçek parça ismi (dışarıdan gelir, liste yok)
  uzunluk: string;      // cm
  genislik: string;     // cm
  sureDakika: string;
  sekilTipi?: SekilTipi;
  shapeNotu?: string;
};

type Tip = {
  id: number;
  tipAdi: string;       // Artık kullanıcıya gösterilmez, dahili
  adet: string;         // Artık kullanıcıya gösterilmez, dahili
  desenAdi: string;
  plakaGenislik: string;
  plakaYukseklik: string;
  plakaFiyati: string;
  imageUrl: string;
  rows: KesimRow[];
};

type Piece = {
  id: number;
  label: string;
  tipAdi?: string;
  parcaTuru?: string;
  damarGrubu?: string;
  genislik: number;
  yukseklik: number;
  x: number;
  y: number;
  slabIndex: number;
  sekilTipi?: SekilTipi;
  shapeNotu?: string;
};

type Slab = { index: number; yerlesim: Piece[] };

type TipResult = {
  tipId: number;
  tipAdi: string;
  desenAdi: string;
  imageUrl: string;
  plakaGenislik: number;
  plakaYukseklik: number;
  plakaFiyati: number;
  plakaSayisi: number;
  fireOrani: number;
  slabs: Slab[];
  yorum: string;
};

export type AIPlakaAktarSonucu = {
  toplamPlaka: number;
  toplamMaliyet: number;
  ortalamaPlakaFiyati: number;
  fireOrani: number;
  fireMaliyeti: number;
  tezgahMtul: number;
  tezgahArasiMtul: number;
  adaTezgahMtul: number;
  stresAlmaMtul: number;
  stresAlmaDakika: number;
  fasonEbatlamaMtul: number;
  fasonEbatlamaDakika: number;
  toplamSureDakika: number;
  plakaGenislik: number;
  plakaYukseklik: number;
  plakaImageUrl?: string;
  rows?: KesimRow[];
  plakaLayoutJson?: any;
};

type Props = {
  embedded?: boolean;
  onApply?: (sonuc: AIPlakaAktarSonucu) => void;
  // Dışarıdan gelen veriler (yeni-is-v3 sayfasından)
  initialProductName?: string;
  initialPlakaGenislik?: string;
  initialPlakaYukseklik?: string;
  initialPlakaFiyati?: string;
  initialRows?: KesimRow[];         // Parça satırları dışarıdan gelir
};

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
const DEFAULT_SURE: Record<string, number> = {
  "stres alma":6,"fason ebatlama":10,"tezgah":25,"tezgah arası":18,
  "l dönüş tezgah":30,"l tezgah arası":20,"ön alın":8,"l ön alın":10,
  "ada tezgah":30,"ada ayak":18,"ada iç dönüş":18,"ada dış dönüş":18,
  "davlumbaz":15,"tezgah ayak":18,"süpürgelik":5,
};

function defaultSure(parcaTuru: string) {
  return DEFAULT_SURE[parcaTuru.toLowerCase().trim()] || 10;
}

function emptyRows(n = 3): KesimRow[] {
  return Array.from({ length: n }, () => ({ parcaTuru:"", uzunluk:"", genislik:"", sureDakika:"" }));
}

function shapeLabel(sekilTipi?: SekilTipi) {
  switch (sekilTipi) {
    case "oval": return "Oval";
    case "kapsul": return "Kapsül";
    case "l_parca": return "L";
    case "ozel_sablon": return "Özel";
    default: return "";
  }
}

function kindLabel(parcaTuru?: string) {
  const t = String(parcaTuru || "").toLowerCase().replace(/\s/g,"_");
  if (t.includes("on_alin") || t.includes("ön_alın") || t === "on_alin") return "Ön alın";
  if (t.includes("tezgah_arasi") || t.includes("tezgah_arası")) return "Tezgah arası";
  if (t.includes("tezgah")) return "Tezgah";
  return "Diğer";
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export function PlakaPlanlayiciV2({
  embedded = false,
  onApply,
  initialProductName = "",
  initialPlakaGenislik = "",
  initialPlakaYukseklik = "",
  initialPlakaFiyati = "",
  initialRows,
}: Props) {

  // Tek tip — dışarıdan gelen verilerle başlatılır
  const [tip, setTip] = useState<Tip>({
    id: 1,
    tipAdi: "Tip-1",
    adet: "1",
    desenAdi: initialProductName,
    plakaGenislik: initialPlakaGenislik,
    plakaYukseklik: initialPlakaYukseklik,
    plakaFiyati: initialPlakaFiyati,
    imageUrl: "",
    rows: initialRows && initialRows.length > 0 ? initialRows : emptyRows(3),
  });

  const [sonuclar, setSonuclar] = useState<TipResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [hata, setHata]         = useState("");

  const dragRef = useRef<{
    tipId: number; slabIndex: number; pieceId: number;
    offsetX: number; offsetY: number;
  } | null>(null);

  // ── Satır CRUD ────────────────────────────────────────────────────────────
  function updateRow(idx: number, patch: Partial<KesimRow>) {
    setTip(prev => ({
      ...prev,
      rows: prev.rows.map((r, i) => i === idx ? { ...r, ...patch } : r)
    }));
  }

  function addRow() {
    setTip(prev => ({
      ...prev,
      rows: [...prev.rows, { parcaTuru:"", uzunluk:"", genislik:"", sureDakika:"" }]
    }));
  }

  function removeRow(idx: number) {
    setTip(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== idx) }));
  }

  function uploadImage(file?: File) {
    if (!file) return;
    setTip(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
  }

  // ── Parça oluştur ─────────────────────────────────────────────────────────
  function buildPieces() {
    const validRows = tip.rows.filter(r => {
      const t = r.parcaTuru.toLowerCase().trim();
      if (!r.parcaTuru || num(r.uzunluk) <= 0) return false;
      if (t === "stres alma" || t === "fason ebatlama") return true;
      return num(r.genislik) > 0;
    });

    const pieces: any[] = [];
    let id = 1;
    for (const row of validRows) {
      const t = row.parcaTuru.toLowerCase().trim();
      if (t === "stres alma" || t === "fason ebatlama") continue;
      pieces.push({
        id: id++,
        label: row.parcaTuru,
        tipAdi: tip.tipAdi,
        parcaTuru: row.parcaTuru,
        genislik: num(row.uzunluk),
        yukseklik: num(row.genislik),
        sekilTipi: row.sekilTipi || "dikdortgen",
        shapeNotu: row.shapeNotu,
      });
    }
    return pieces;
  }

  // ── Hesapla ───────────────────────────────────────────────────────────────
  async function hesapla() {
    setLoading(true); setHata(""); setSonuclar([]);
    try {
      const pieces = buildPieces();
      const plakaGenislik = num(tip.plakaGenislik);
      const plakaYukseklik = num(tip.plakaYukseklik);
      if (!pieces.length) throw new Error("Geçerli parça bulunamadı.");
      if (!plakaGenislik || !plakaYukseklik) throw new Error("Plaka ölçüsü eksik.");

      const res = await fetch("/api/ai-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaka: { genislik: plakaGenislik, yukseklik: plakaYukseklik }, pieces }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Hesaplanamadı.");

      setSonuclar([{
        tipId: tip.id,
        tipAdi: tip.tipAdi,
        desenAdi: tip.desenAdi,
        imageUrl: tip.imageUrl,
        plakaGenislik: json.plaka?.genislik ?? plakaGenislik,
        plakaYukseklik: json.plaka?.yukseklik ?? plakaYukseklik,
        plakaFiyati: num(tip.plakaFiyati),
        plakaSayisi: json.plakaSayisi || 0,
        fireOrani: Number(json.fireOrani || 0),
        slabs: json.slabs || [],
        yorum: json.yorum || "",
      }]);
    } catch(e: any) {
      setHata(e?.message || "Hesaplama sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  // ── Sürükleme ─────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    slabIndex: number, piece: Piece,
    boardRef: React.RefObject<HTMLDivElement>,
    plakaW: number, plakaH: number
  ) => {
    e.preventDefault(); e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const scaleX = boardRef.current!.clientWidth / plakaW;
    const scaleY = boardRef.current!.clientHeight / plakaH;
    dragRef.current = {
      tipId: 1, slabIndex, pieceId: piece.id,
      offsetX: (e.clientX - board.left) / scaleX - piece.x,
      offsetY: (e.clientY - board.top) / scaleY - piece.y,
    };
  }, []);

  const handlePointerMove = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    slabIndex: number, plakaW: number, plakaH: number,
    boardRef: React.RefObject<HTMLDivElement>
  ) => {
    if (!dragRef.current || dragRef.current.slabIndex !== slabIndex) return;
    e.preventDefault();
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const scaleX = boardRef.current!.clientWidth / plakaW;
    const scaleY = boardRef.current!.clientHeight / plakaH;
    const logX = (e.clientX - board.left) / scaleX - dragRef.current.offsetX;
    const logY = (e.clientY - board.top) / scaleY - dragRef.current.offsetY;

    setSonuclar(prev => prev.map(r => ({
      ...r,
      slabs: r.slabs.map(slab => {
        if (slab.index !== slabIndex) return slab;
        return {
          ...slab,
          yerlesim: slab.yerlesim.map(p => {
            if (p.id !== dragRef.current!.pieceId) return p;
            const nx = Math.max(0, Math.min(plakaW - p.genislik, Math.round(logX)));
            const ny = Math.max(0, Math.min(plakaH - p.yukseklik, Math.round(logY)));
            return { ...p, x: nx, y: ny };
          }),
        };
      }),
    })));
  }, []);

  const stopDrag = useCallback(() => { dragRef.current = null; }, []);

  function rotatePiece(slabIndex: number, pieceId: number, plakaW: number, plakaH: number) {
    setSonuclar(prev => prev.map(r => ({
      ...r,
      slabs: r.slabs.map(slab => {
        if (slab.index !== slabIndex) return slab;
        return {
          ...slab,
          yerlesim: slab.yerlesim.map(p => {
            if (p.id !== pieceId) return p;
            const nextW = p.yukseklik;
            const nextH = p.genislik;
            return {
              ...p,
              genislik: nextW,
              yukseklik: nextH,
              x: Math.max(0, Math.min(plakaW - nextW, p.x)),
              y: Math.max(0, Math.min(plakaH - nextH, p.y)),
            };
          }),
        };
      }),
    })));
  }

  // ── Özet ─────────────────────────────────────────────────────────────────
  const toplamlar = useMemo(() => {
    const toplamPlaka = sonuclar.reduce((a, r) => a + r.plakaSayisi, 0);
    const toplamMaliyet = sonuclar.reduce((a, r) => a + r.plakaSayisi * r.plakaFiyati, 0);
    const agirlikliFire = toplamPlaka > 0
      ? sonuclar.reduce((a, r) => a + r.fireOrani * r.plakaSayisi, 0) / toplamPlaka : 0;
    const fireMaliyeti = (agirlikliFire / 100) * toplamMaliyet;
    return { toplamPlaka, toplamMaliyet, agirlikliFire, fireMaliyeti };
  }, [sonuclar]);

  function buildAktarSonucu(): AIPlakaAktarSonucu {
    const { toplamPlaka, toplamMaliyet, agirlikliFire, fireMaliyeti } = toplamlar;
    let tezgahMtul=0, tezgahArasiMtul=0, adaTezgahMtul=0;
    let stresAlmaMtul=0, stresAlmaDakika=0, fasonEbatlamaMtul=0, fasonEbatlamaDakika=0, toplamSureDakika=0;

    for (const row of tip.rows) {
      const t = row.parcaTuru.toLowerCase().trim();
      const sure = num(row.sureDakika) || defaultSure(t);
      const mtul = (t === "stres alma" || t === "fason ebatlama")
        ? num(row.uzunluk) : (num(row.uzunluk) / 100);
      toplamSureDakika += mtul * sure;
      if (t === "stres alma")      { stresAlmaMtul += mtul; stresAlmaDakika += mtul * sure; continue; }
      if (t === "fason ebatlama")  { fasonEbatlamaMtul += mtul; fasonEbatlamaDakika += mtul * sure; continue; }
      if (t.includes("tezgah") && !t.includes("arası") && !t.includes("arasi")) tezgahMtul += mtul;
      if (t.includes("tezgah arası") || t.includes("tezgah arasi")) tezgahArasiMtul += mtul;
      if (t.includes("ada tezgah")) adaTezgahMtul += mtul;
    }

    return {
      toplamPlaka, toplamMaliyet,
      ortalamaPlakaFiyati: toplamPlaka > 0 ? toplamMaliyet / toplamPlaka : 0,
      fireOrani: agirlikliFire, fireMaliyeti,
      tezgahMtul, tezgahArasiMtul, adaTezgahMtul,
      stresAlmaMtul, stresAlmaDakika, fasonEbatlamaMtul, fasonEbatlamaDakika, toplamSureDakika,
      plakaGenislik: num(tip.plakaGenislik),
      plakaYukseklik: num(tip.plakaYukseklik),
      plakaImageUrl: tip.imageUrl,
      rows: tip.rows,
      plakaLayoutJson: sonuclar[0] ? {
        plakaSayisi: sonuclar[0].plakaSayisi,
        slabs: sonuclar[0].slabs,
        fireOrani: sonuclar[0].fireOrani,
        rows: tip.rows,
        plaka: {
          genislik: num(tip.plakaGenislik),
          yukseklik: num(tip.plakaYukseklik),
        },
      } : null,
    };
  }

  function aktar() {
    const sonuc = buildAktarSonucu();
    if (onApply) { onApply(sonuc); return; }
    localStorage.setItem("aiPlakaSonuc", JSON.stringify(sonuc));
    window.location.href = "/dashboard/yeni-is-v3";
  }

  // ── PDF çıktı ─────────────────────────────────────────────────────────────
  function pdfCikti() {
    const printW = window.open("", "_blank");
    if (!printW) return;

    const tiplerHTML = sonuclar.map(result => {
      const slabsHTML = result.slabs.map(slab => {
        const piecesHTML = slab.yerlesim.map(p => {
          const c = kindColor(p.parcaTuru);
          const labelText = (p.parcaTuru || "parça").replace(/_/g, " ");
          return `<div style="
            position:absolute;
            left:${(p.x / result.plakaGenislik) * 100}%;
            top:${(p.y / result.plakaYukseklik) * 100}%;
            width:${(p.genislik / result.plakaGenislik) * 100}%;
            height:${(p.yukseklik / result.plakaYukseklik) * 100}%;
            background:${c.bg};border:2px solid ${c.border};box-sizing:border-box;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            font-size:9px;font-weight:900;color:${c.text};text-align:center;padding:2px;
          ">
            <span>${labelText}</span>
            <small style="font-size:8px">${p.genislik}×${p.yukseklik}</small>
          </div>`;
        }).join("");
        return `
          <div style="margin-bottom:20px">
            <div style="font-weight:900;margin-bottom:6px;font-size:13px">Plaka ${slab.index + 1}</div>
            <div style="position:relative;width:100%;aspect-ratio:${result.plakaGenislik}/${result.plakaYukseklik};
              border:3px solid #1e293b;background:linear-gradient(135deg,#d9d0c0,#f8f1e7,#b8ad9d,#efe4d2);box-sizing:border-box;">
              ${piecesHTML}
            </div>
          </div>`;
      }).join("");

      return `
        <div style="break-inside:avoid;margin-bottom:32px">
          <h2 style="font-size:16px;font-weight:900;margin:0 0 4px">${result.desenAdi || "Plaka Planı"}</h2>
          <p style="margin:0 0 12px;font-size:12px;color:#64748b">
            ${result.plakaSayisi} plaka · Fire %${result.fireOrani.toFixed(2)} · €${(result.plakaSayisi * result.plakaFiyati).toFixed(2)}
          </p>
          ${slabsHTML}
        </div>`;
    }).join("");

    printW.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>Plaka Yerleşim Planı</title>
      <style>body{font-family:sans-serif;margin:24px;color:#1e293b}h1{font-size:20px;font-weight:900;margin-bottom:20px}@media print{body{margin:12px}}</style>
    </head><body>
      <h1>Plaka Yerleşim Planı${tip.desenAdi ? ` — ${tip.desenAdi}` : ""}</h1>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#64748b">Toplam Plaka</div>
          <div style="font-size:22px;font-weight:900">${toplamlar.toplamPlaka}</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#64748b">Toplam Maliyet</div>
          <div style="font-size:22px;font-weight:900">€${toplamlar.toplamMaliyet.toFixed(2)}</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#64748b">Ortalama Fire</div>
          <div style="font-size:22px;font-weight:900">%${toplamlar.agirlikliFire.toFixed(2)}</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#64748b">Fire Maliyeti</div>
          <div style="font-size:22px;font-weight:900">€${toplamlar.fireMaliyeti.toFixed(2)}</div>
        </div>
      </div>
      ${tiplerHTML}
    </body></html>`);
    printW.document.close();
    setTimeout(() => printW.print(), 600);
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {!embedded && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Metrix AI</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight lg:text-4xl">Plaka Planlayıcı</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ön alın dıştan içe → tezgah → tezgah arası sırası korunarak yerleşim hesaplanır.
            </p>
          </div>
        </section>
      )}

      {/* Renk açıklaması */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          { k:"on_alin",label:"Ön Alın" },
          { k:"tezgah",label:"Tezgah" },
          { k:"tezgah_arasi",label:"Tezgah Arası" },
          { k:"default",label:"Diğer" },
        ].map(({ k, label }) => {
          const c = KIND_COLOR[k];
          return (
            <span key={k} className="rounded-xl px-3 py-1 text-xs font-bold"
              style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.text }}>
              {label}
            </span>
          );
        })}
        <span className="ml-auto text-xs text-slate-400">Parçaları sürükleyebilirsiniz</span>
      </div>

      {/* Plaka ayarları + parça listesi */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        {/* Plaka ölçüleri */}
        <h2 className="mb-4 text-base font-black text-slate-800">Plaka Bilgileri</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-bold text-slate-500">
            Desen / Ürün
            <input value={tip.desenAdi} onChange={e => setTip(p => ({ ...p, desenAdi: e.target.value }))}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          </label>
          <label className="block text-xs font-bold text-slate-500">
            Plaka Genişlik (cm)
            <input value={tip.plakaGenislik} onChange={e => setTip(p => ({ ...p, plakaGenislik: e.target.value }))}
              type="text" inputMode="decimal"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          </label>
          <label className="block text-xs font-bold text-slate-500">
            Plaka Yükseklik (cm)
            <input value={tip.plakaYukseklik} onChange={e => setTip(p => ({ ...p, plakaYukseklik: e.target.value }))}
              type="text" inputMode="decimal"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          </label>
          <label className="block text-xs font-bold text-slate-500">
            Plaka Fiyatı (€)
            <input value={tip.plakaFiyati} onChange={e => setTip(p => ({ ...p, plakaFiyati: e.target.value }))}
              type="text" inputMode="decimal"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          </label>
        </div>

        {/* Plaka görseli */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold text-slate-600">Plaka görseli yükle (opsiyonel)</p>
          <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0])}
            className="block w-full text-sm" />
          {tip.imageUrl && (
            <div className="mt-3 h-20 rounded-xl border border-slate-200 bg-cover bg-center"
              style={{ backgroundImage: `url(${tip.imageUrl})` }} />
          )}
        </div>

        {/* Parça listesi */}
        <div className="mt-5">
          <h2 className="mb-3 text-base font-black text-slate-800">Kesim Parçaları</h2>
          <p className="mb-3 text-xs text-slate-400">
            Parça isimleri 2 Kesim sayfasından otomatik gelir. Düzenleyebilirsiniz.
          </p>

          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2 px-1">
            {["Parça Adı / Türü","Uzunluk (cm)","Genişlik (cm)","dk/mtül",""].map(h => (
              <span key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</span>
            ))}
          </div>

          <div className="space-y-2">
            {tip.rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 rounded-2xl bg-slate-50 p-3 sm:p-0 sm:bg-transparent">
                {/* Mobil etiket */}
                <div className="sm:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Parça {idx + 1}
                </div>
                {/* Parça adı — düzenlenebilir text input, liste yok */}
                <div>
                  <input
                    value={row.parcaTuru}
                    onChange={e => updateRow(idx, { parcaTuru: e.target.value })}
                    placeholder="örn: Ana Tezgah, Ön Alın..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  {shapeLabel(row.sekilTipi) && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">{shapeLabel(row.sekilTipi)}</span>
                      {row.shapeNotu && <span className="truncate">{row.shapeNotu}</span>}
                    </div>
                  )}
                </div>
                <input value={row.uzunluk} onChange={e => updateRow(idx, { uzunluk: e.target.value })}
                  type="text" inputMode="decimal" placeholder="0"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <input value={row.genislik} onChange={e => updateRow(idx, { genislik: e.target.value })}
                  type="text" inputMode="decimal" placeholder="0"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <input value={row.sureDakika} onChange={e => updateRow(idx, { sureDakika: e.target.value })}
                  type="text" inputMode="decimal" placeholder={String(defaultSure(row.parcaTuru))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <button onClick={() => removeRow(idx)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 text-sm font-bold">
                  ×
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow}
            className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition">
            + Satır Ekle
          </button>
        </div>

        {hata && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {hata}
          </div>
        )}

        <button onClick={hesapla} disabled={loading}
          className="mt-5 rounded-2xl bg-gradient-to-br from-slate-900 to-violet-900 px-6 py-4
            text-sm font-black text-white shadow-lg disabled:opacity-50 hover:opacity-90 transition">
          {loading ? "Hesaplanıyor..." : "⚡ Damar Takipli Yerleşimi Hesapla"}
        </button>
      </section>

      {/* Özet metrikler */}
      {sonuclar.length > 0 && (
        <section className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <Metric title="Toplam Plaka"   value={`${toplamlar.toplamPlaka}`} />
          <Metric title="Toplam Maliyet" value={`€${toplamlar.toplamMaliyet.toFixed(2)}`} />
          <Metric title="Ortalama Fire"  value={`%${toplamlar.agirlikliFire.toFixed(2)}`} />
          <Metric title="Fire Maliyeti"  value={`€${toplamlar.fireMaliyeti.toFixed(2)}`} />

          <button onClick={aktar}
            className="col-span-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-4
              text-left text-white shadow-lg hover:scale-[1.01] transition">
            <p className="text-xs font-bold text-white/70">Yeni İş'e Aktar</p>
            <p className="mt-1 text-base font-black">Planı Kullan →</p>
          </button>

          <button onClick={pdfCikti}
            className="col-span-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700
              shadow hover:bg-slate-50 transition flex flex-col items-center justify-center gap-1">
            <span className="text-xl">🖨️</span>
            <span>PDF Çıktı</span>
          </button>
        </section>
      )}

      {/* Plaka görselleri */}
      <section className="space-y-5">
        {sonuclar.map(result => (
          <div key={result.tipId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {result.desenAdi || "Plaka Planı"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{result.yorum}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill label="Plaka"   value={`${result.plakaSayisi}`} />
                <Pill label="Fire"    value={`%${result.fireOrani.toFixed(2)}`} />
                <Pill label="Maliyet" value={`€${(result.plakaSayisi * result.plakaFiyati).toFixed(2)}`} />
              </div>
            </div>

            <div className="space-y-5">
              {result.slabs.map(slab => (
                <SingleSlab
                  key={slab.index}
                  slab={slab}
                  result={result}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onRotate={rotatePiece}
                  stopDrag={stopDrag}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ─── Tek plaka görseli ────────────────────────────────────────────────────────
function SingleSlab({ slab, result, onPointerDown, onPointerMove, onRotate, stopDrag }: {
  slab: Slab; result: TipResult;
  onPointerDown: any; onPointerMove: any; onRotate: any; stopDrag: any;
}) {
  const boardRef = useRef<HTMLDivElement>(null!);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const parcaAlani = slab.yerlesim.reduce((s, p) => s + p.genislik * p.yukseklik, 0);
  const plakaAlani = result.plakaGenislik * result.plakaYukseklik;
  const slabFire   = plakaAlani > 0 ? ((plakaAlani - parcaAlani) / plakaAlani * 100) : 0;
  const selectedPiece = useMemo(
    () => slab.yerlesim.find(p => p.id === selectedPieceId) || null,
    [slab.yerlesim, selectedPieceId]
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-xl sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-white">Plaka {slab.index + 1}</h4>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">CAD yerleşim alanı · parçalar sürüklenebilir</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-200">
            Fire: %{slabFire.toFixed(1)}
          </span>
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-300">
            {result.plakaGenislik}×{result.plakaYukseklik} cm · {slab.yerlesim.length} parça
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div
          className="rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-inner"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px), radial-gradient(circle at 12px 12px, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px, 28px 28px, 14px 14px",
          }}
        >
          <div
            ref={boardRef}
            onPointerMove={e => onPointerMove(e, slab.index, result.plakaGenislik, result.plakaYukseklik, boardRef)}
            onPointerUp={stopDrag}
            onPointerLeave={stopDrag}
            className="relative touch-none overflow-hidden border-[3px] border-cyan-200/80 shadow-[0_0_0_1px_rgba(15,23,42,0.95),0_18px_55px_rgba(0,0,0,0.45)] w-full"
        style={{
          aspectRatio: `${result.plakaGenislik}/${result.plakaYukseklik}`,
          backgroundImage: result.imageUrl
            ? `url(${result.imageUrl})`
            : "linear-gradient(135deg,#d9d0c0 0%,#f8f1e7 32%,#b8ad9d 58%,#efe4d2 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {slab.yerlesim.map(p => {
          const c = kindColor(p.parcaTuru);
          const label = (p.parcaTuru || "").replace(/_/g, " ");
          const sekil = p.sekilTipi || "dikdortgen";
          const shapeTag = shapeLabel(sekil);
          const isSpecialShape = sekil !== "dikdortgen";
          const wPct = (p.genislik / result.plakaGenislik) * 100;
          const hPct = (p.yukseklik / result.plakaYukseklik) * 100;
          const isTiny = wPct < 8 || hPct < 11;
          const isSelected = selectedPieceId === p.id;
          return (
            <div
              key={p.id}
              title={`${label} · ${p.genislik}×${p.yukseklik} cm · ${kindLabel(p.parcaTuru)}${shapeTag ? ` · ${shapeTag}` : ""}`}
              onPointerDown={e => {
                setSelectedPieceId(p.id);
                onPointerDown(e, slab.index, p, boardRef, result.plakaGenislik, result.plakaYukseklik);
              }}
              className="absolute touch-none select-none cursor-grab active:cursor-grabbing
                group flex flex-col items-center justify-center text-center transition
                hover:z-20 hover:brightness-110"
              style={{
                left: `${(p.x / result.plakaGenislik) * 100}%`,
                top: `${(p.y / result.plakaYukseklik) * 100}%`,
                width: `${wPct}%`,
                height: `${hPct}%`,
                background: isSpecialShape ? "transparent" : c.bg,
                border: isSpecialShape ? "1px dashed rgba(15,23,42,0.45)" : `2px solid ${isSelected ? "#f8fafc" : c.border}`,
                color: c.text,
                boxSizing: "border-box",
                padding: isTiny ? "1px" : "4px",
                boxShadow: isSelected
                  ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 26px ${c.border}`
                  : "0 1px 8px rgba(15,23,42,0.18)",
                zIndex: isSelected ? 30 : 1,
              }}
            >
              {isSpecialShape && (
                <div
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    inset: 2,
                    background: c.bg,
                    border: sekil === "ozel_sablon" ? `2px dashed ${isSelected ? "#f8fafc" : c.border}` : `2px solid ${isSelected ? "#f8fafc" : c.border}`,
                    borderRadius: sekil === "oval" || sekil === "kapsul" ? "999px" : sekil === "ozel_sablon" ? "8px" : "2px",
                    clipPath: sekil === "l_parca" ? "polygon(0 0,100% 0,100% 38%,38% 38%,38% 100%,0 100%)" : undefined,
                  }}
                />
              )}
              {shapeTag && !isTiny && (
                <span
                  className="absolute left-1 top-1 z-[2] max-w-[calc(100%-38px)] truncate rounded-full border border-white/25 bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-black text-white shadow"
                >
                  {shapeTag}
                </span>
              )}
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedPieceId(p.id);
                  onRotate(slab.index, p.id, result.plakaGenislik, result.plakaYukseklik);
                }}
                className="absolute right-1 top-1 z-[3] rounded border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-slate-900 opacity-90 shadow transition group-hover:opacity-100"
                title="90 derece döndür"
              >
                90°
              </button>
              {!isTiny && (
                <span className="relative z-[1] max-w-full truncate px-1 text-[clamp(8px,1vw,11px)] font-black leading-tight drop-shadow">
                  {label}
                </span>
              )}
              <small className="relative z-[1] max-w-full truncate rounded bg-slate-950/35 px-1 text-[clamp(7px,0.9vw,10px)] font-bold leading-tight text-white/90">
                {p.genislik}×{p.yukseklik}
              </small>
              {!isTiny && (
                <span className="absolute bottom-1 left-1 z-[2] max-w-[calc(100%-8px)] truncate rounded bg-white/85 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-900">
                  {kindLabel(p.parcaTuru)}
                </span>
              )}
            </div>
          );
        })}
          </div>
        </div>

        <aside className="hidden rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-slate-200 shadow-inner md:block">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Seçili Parça</p>
          {selectedPiece ? (
            <div className="mt-3 space-y-2">
              <div>
                <p className="truncate text-sm font-black text-white" title={selectedPiece.parcaTuru || selectedPiece.label}>
                  {selectedPiece.parcaTuru || selectedPiece.label || "Parça"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Plaka {slab.index + 1}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                  <dt className="text-[9px] font-black uppercase text-slate-500">Ölçü</dt>
                  <dd className="mt-0.5 font-black text-slate-100">{selectedPiece.genislik}×{selectedPiece.yukseklik}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                  <dt className="text-[9px] font-black uppercase text-slate-500">Şekil</dt>
                  <dd className="mt-0.5 font-black text-slate-100">{shapeLabel(selectedPiece.sekilTipi) || "Dikdörtgen"}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                  <dt className="text-[9px] font-black uppercase text-slate-500">Sıra</dt>
                  <dd className="mt-0.5 font-black text-slate-100">{kindLabel(selectedPiece.parcaTuru)}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                  <dt className="text-[9px] font-black uppercase text-slate-500">Konum</dt>
                  <dd className="mt-0.5 font-black text-slate-100">{selectedPiece.x},{selectedPiece.y}</dd>
                </div>
              </dl>
              {selectedPiece.shapeNotu && (
                <p className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs font-semibold text-slate-300">
                  {selectedPiece.shapeNotu}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              Detayları görmek için bir parçaya tıklayın.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Küçük UI ─────────────────────────────────────────────────────────────────
function Metric({ title, value }: { title:string; value:string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow border border-slate-100">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function Pill({ label, value }: { label:string; value:string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}
