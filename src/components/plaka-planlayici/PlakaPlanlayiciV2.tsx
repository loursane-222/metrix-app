"use client";

import { useMemo, useState } from "react";

const PART_OPTIONS = [
  "stres alma",
  "fason ebatlama",
  "ön alın",
  "tezgah",
  "tezgah arası",
  "L dönüş tezgah",
  "L tezgah arası",
  "L ön alın",
  "ada tezgah",
  "ada ayak",
  "ada iç dönüş",
  "ada dış dönüş",
  "davlumbaz",
  "tezgah ayak",
  "süpürgelik",
];

type KesimRow = {
  parcaTuru: string;
  uzunluk: string;
  genislik: string;
  sureDakika: string;
};

type Tip = {
  id: number;
  tipAdi: string;
  adet: string;
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
};

type Slab = {
  index: number;
  yerlesim: Piece[];
};

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
};

type Props = {
  embedded?: boolean;
  onApply?: (sonuc: AIPlakaAktarSonucu) => void;
  initialProductName?: string;
  initialPlakaGenislik?: string;
  initialPlakaYukseklik?: string;
  initialPlakaFiyati?: string;
};

const scale = 2;

const DEFAULT_SURE_DK: Record<string, number> = {
  "stres alma": 6,
  "fason ebatlama": 10,
  "tezgah": 25,
  "tezgah arası": 18,
  "l dönüş tezgah": 30,
  "l tezgah arası": 20,
  "ön alın": 8,
  "l ön alın": 10,
  "ada tezgah": 30,
  "ada ayak": 18,
  "ada iç dönüş": 18,
  "ada dış dönüş": 18,
  "davlumbaz": 15,
  "tezgah ayak": 18,
  "süpürgelik": 5,
};

function defaultSure(parcaTuru: string) {
  return DEFAULT_SURE_DK[parcaTuru.toLowerCase().trim()] || 10;
}

function emptyRows(count = 5): KesimRow[] {
  return Array.from({ length: count }, () => ({
    parcaTuru: "",
    uzunluk: "",
    genislik: "",
    sureDakika: "",
  }));
}

function newTip(id: number, initial?: Partial<Tip>): Tip {
  return {
    id,
    tipAdi: `Tip-${id}`,
    adet: "",
    desenAdi: "",
    plakaGenislik: "",
    plakaYukseklik: "",
    plakaFiyati: "",
    imageUrl: "",
    rows: emptyRows(5),
    ...(initial || {}),
  };
}

function num(v: string) {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function PlakaPlanlayiciV2({
  embedded = false,
  onApply,
  initialProductName = "",
  initialPlakaGenislik = "",
  initialPlakaYukseklik = "",
  initialPlakaFiyati = "",
}: Props) {
  const [tipler, setTipler] = useState<Tip[]>([
    newTip(1, {
      desenAdi: initialProductName || "",
      plakaGenislik: initialPlakaGenislik || "",
      plakaYukseklik: initialPlakaYukseklik || "",
      plakaFiyati: initialPlakaFiyati || "",
    }),
  ]);
  const [sonuclar, setSonuclar] = useState<TipResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState("");
  const [dragging, setDragging] = useState<{
    tipId: number;
    slabIndex: number;
    pieceIndex: number;
  } | null>(null);

  const toplamlar = useMemo(() => {
    const toplamPlaka = sonuclar.reduce((a, r) => a + r.plakaSayisi, 0);
    const toplamMaliyet = sonuclar.reduce((a, r) => a + r.plakaSayisi * r.plakaFiyati, 0);
    const agirlikliFire =
      toplamPlaka > 0
        ? sonuclar.reduce((a, r) => a + r.fireOrani * r.plakaSayisi, 0) / toplamPlaka
        : 0;
    const fireMaliyeti = (agirlikliFire / 100) * toplamMaliyet;

    return { toplamPlaka, toplamMaliyet, agirlikliFire, fireMaliyeti };
  }, [sonuclar]);

  function updateTip(id: number, patch: Partial<Tip>) {
    setTipler((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function updateRow(tipId: number, rowIndex: number, patch: Partial<KesimRow>) {
    setTipler((prev) =>
      prev.map((t) =>
        t.id === tipId
          ? { ...t, rows: t.rows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)) }
          : t
      )
    );
  }

  function addTip() {
    if (tipler.length >= 20) return;
    const nextId = Math.max(...tipler.map((t) => t.id)) + 1;
    setTipler((prev) => [...prev, newTip(nextId)]);
  }

  function removeTip(id: number) {
    if (tipler.length === 1) return;
    setTipler((prev) => prev.filter((t) => t.id !== id));
    setSonuclar((prev) => prev.filter((r) => r.tipId !== id));
  }

  function addRow(tipId: number) {
    setTipler((prev) =>
      prev.map((t) =>
        t.id === tipId
          ? { ...t, rows: [...t.rows, { parcaTuru: "", uzunluk: "", genislik: "", sureDakika: "" }] }
          : t
      )
    );
  }

  function uploadImage(tipId: number, file?: File) {
    if (!file) return;
    updateTip(tipId, { imageUrl: URL.createObjectURL(file) });
  }

  function buildPieces(tip: Tip) {
    const adet = Math.max(1, Math.floor(num(tip.adet)));
    const validRows = tip.rows.filter((r) => {
      const tur = r.parcaTuru.toLowerCase().trim();
      if (!r.parcaTuru || num(r.uzunluk) <= 0) return false;
      if (tur === "stres alma") return true;
      if (tur === "fason ebatlama") return true;
      return num(r.genislik) > 0;
    });

    const pieces: any[] = [];
    let id = 1;

    for (let n = 0; n < adet; n++) {
      for (const row of validRows) {
        const tur = row.parcaTuru.toLowerCase().trim();

        // Stres alma ve fason ebatlama plaka üstüne yerleşen parça değildir.
        // Sadece mtül bazlı üretim/maliyet kalemidir.
        if (tur === "stres alma" || tur === "fason ebatlama") continue;

        pieces.push({
          id: id++,
          label: `${tip.tipAdi}-${n + 1} / ${row.parcaTuru}`,
          tipAdi: tip.tipAdi,
          parcaTuru: row.parcaTuru,
          genislik: num(row.uzunluk),
          yukseklik: num(row.genislik),
        });
      }
    }

    return pieces;
  }

  function buildAktarSonucu(): AIPlakaAktarSonucu {
    const toplamPlaka = toplamlar.toplamPlaka;
    const toplamMaliyet = toplamlar.toplamMaliyet;
    const ortalamaPlakaFiyati = toplamPlaka > 0 ? toplamMaliyet / toplamPlaka : 0;

    let tezgahMtul = 0;
    let tezgahArasiMtul = 0;
    let adaTezgahMtul = 0;
    let stresAlmaMtul = 0;
    let stresAlmaDakika = 0;
    let fasonEbatlamaMtul = 0;
    let fasonEbatlamaDakika = 0;
    let toplamSureDakika = 0;

    for (const tip of tipler) {
      const adet = Math.max(1, Math.floor(num(tip.adet)));
      for (const row of tip.rows) {
        const tur = row.parcaTuru.toLowerCase().trim();
        const sure = num(row.sureDakika) || defaultSure(tur);
        const mtul = (tur === "stres alma" || tur === "fason ebatlama")
          ? num(row.uzunluk) * adet
          : (num(row.uzunluk) / 100) * adet;

        toplamSureDakika += mtul * sure;

        if (tur === "stres alma") {
          stresAlmaMtul += mtul;
          stresAlmaDakika += mtul * sure;
          continue;
        }

        if (tur === "fason ebatlama") {
          fasonEbatlamaMtul += mtul;
          fasonEbatlamaDakika += mtul * sure;
          continue;
        }

        if (tur === "tezgah" || tur === "l dönüş tezgah") tezgahMtul += mtul;
        if (tur === "tezgah arası" || tur === "l tezgah arası") tezgahArasiMtul += mtul;
        if (tur === "ada tezgah") adaTezgahMtul += mtul;
      }
    }

    const ilkTip = tipler.find((t) => num(t.plakaGenislik) > 0 && num(t.plakaYukseklik) > 0);

    return {
      toplamPlaka,
      toplamMaliyet,
      ortalamaPlakaFiyati,
      fireOrani: toplamlar.agirlikliFire,
      fireMaliyeti: toplamlar.fireMaliyeti,
      tezgahMtul,
      tezgahArasiMtul,
      adaTezgahMtul,
      stresAlmaMtul,
      stresAlmaDakika,
      fasonEbatlamaMtul,
      fasonEbatlamaDakika,
      toplamSureDakika,
      plakaGenislik: ilkTip ? num(ilkTip.plakaGenislik) : 0,
      plakaYukseklik: ilkTip ? num(ilkTip.plakaYukseklik) : 0,
    };
  }

  function aktar() {
    const sonuc = buildAktarSonucu();

    if (onApply) {
      onApply(sonuc);
      return;
    }

    localStorage.setItem("aiPlakaSonuc", JSON.stringify(sonuc));
    window.location.href = "/dashboard/yeni-is";
  }

  async function hesapla() {
    setLoading(true);
    setHata("");
    setSonuclar([]);

    try {
      const results: TipResult[] = [];

      for (const tip of tipler) {
        const pieces = buildPieces(tip);
        const plakaGenislik = num(tip.plakaGenislik);
        const plakaYukseklik = num(tip.plakaYukseklik);
        const plakaFiyati = num(tip.plakaFiyati);

        if (!pieces.length) continue;
        if (!plakaGenislik || !plakaYukseklik) throw new Error(`${tip.tipAdi} için plaka ölçüsü eksik.`);

        const res = await fetch("/api/ai-layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plaka: { genislik: plakaGenislik, yukseklik: plakaYukseklik },
            pieces,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || `${tip.tipAdi} hesaplanamadı.`);

        results.push({
          tipId: tip.id,
          tipAdi: tip.tipAdi,
          desenAdi: tip.desenAdi,
          imageUrl: tip.imageUrl,
          plakaGenislik,
          plakaYukseklik,
          plakaFiyati,
          plakaSayisi: json.plakaSayisi || 0,
          fireOrani: Number(json.fireOrani || 0),
          slabs: json.slabs || [],
          yorum: json.yorum || "",
        });
      }

      setSonuclar(results);
    } catch (e: any) {
      setHata(e?.message || "Hesaplama sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function movePiece(e: React.MouseEvent<HTMLDivElement>, result: TipResult, slabIndex: number) {
    if (!dragging || dragging.tipId !== result.tipId || dragging.slabIndex !== slabIndex) return;

    const board = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - board.left;
    const mouseY = e.clientY - board.top;

    setSonuclar((prev) =>
      prev.map((r) => {
        if (r.tipId !== result.tipId) return r;

        return {
          ...r,
          slabs: r.slabs.map((slab) => {
            if (slab.index !== slabIndex) return slab;

            return {
              ...slab,
              yerlesim: slab.yerlesim.map((p, i) =>
                i === dragging.pieceIndex
                  ? {
                      ...p,
                      x: Math.max(0, Math.round(mouseX / scale - p.genislik / 2)),
                      y: Math.max(0, Math.round(mouseY / scale - p.yukseklik / 2)),
                    }
                  : p
              ),
            };
          }),
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.34),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.36),_transparent_34%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Metrix AI</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight lg:text-5xl">
              AI Plaka Optimizasyonu
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Tek işten toplu projeye kadar; ölçüleri, desenleri ve damar takibini dikkate alarak plaka ihtiyacını ve fire maliyetini hesapla.
            </p>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tipler ve desenler</h2>
            <p className="mt-1 text-sm text-slate-500">Her tip farklı plaka/desen kullanabilir. Her tip kendi içinde hesaplanır.</p>
          </div>

          <button
            type="button"
            onClick={addTip}
            disabled={tipler.length >= 20}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:opacity-40"
          >
            + Tip Ekle ({tipler.length}/20)
          </button>
        </div>

        <div className="space-y-4">
          {tipler.map((tip) => (
            <div key={tip.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_110px_1fr_130px_130px_130px_auto]">
                <Input label="Tip Adı" value={tip.tipAdi} onChange={(v) => updateTip(tip.id, { tipAdi: v })} />
                <Input label="Adet" value={tip.adet} onChange={(v) => updateTip(tip.id, { adet: v })} />
                <Input label="Desen / Ürün" value={tip.desenAdi} onChange={(v) => updateTip(tip.id, { desenAdi: v })} />
                <Input label="Plaka Genişlik" value={tip.plakaGenislik} onChange={(v) => updateTip(tip.id, { plakaGenislik: v })} />
                <Input label="Plaka Yükseklik" value={tip.plakaYukseklik} onChange={(v) => updateTip(tip.id, { plakaYukseklik: v })} />
                <Input label="Plaka Fiyatı €" value={tip.plakaFiyati} onChange={(v) => updateTip(tip.id, { plakaFiyati: v })} />

                <div className="flex items-end">
                  <button type="button" onClick={() => removeTip(tip.id)} className="h-[46px] rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700">
                    Sil
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-bold text-slate-700">Tipe özel plaka görseli</p>
                  <input type="file" accept="image/*" onChange={(e) => uploadImage(tip.id, e.target.files?.[0])} className="block w-full text-sm" />
                  <div
                    className="mt-3 h-28 rounded-2xl border border-slate-200 bg-cover bg-center"
                    style={{
                      backgroundImage: tip.imageUrl
                        ? `url(${tip.imageUrl})`
                        : "linear-gradient(135deg,#e5ded2,#faf7f0,#bdb3a4)",
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 grid grid-cols-[1.25fr_.75fr_.75fr_.75fr] gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    <span>Kesilecek Parça</span>
                    <span>Uzunluk / mtül</span>
                    <span>Genişlik</span>
                    <span>1 mtül dk</span>
                  </div>

                  <div className="space-y-2">
                    {tip.rows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1.25fr_.75fr_.75fr_.75fr] gap-2">
                        <select
                          value={row.parcaTuru}
                          onChange={(e) => {
                            const selected = e.target.value;
                            updateRow(tip.id, idx, {
                              parcaTuru: selected,
                              genislik: selected.toLowerCase().trim() === "stres alma" ? "" : row.genislik,
                              sureDakika: row.sureDakika || String(defaultSure(selected)),
                            });
                          }}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        >
                          <option value="">Seçiniz</option>
                          {PART_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        <Cell value={row.uzunluk} onChange={(v) => updateRow(tip.id, idx, { uzunluk: v })} />
                        {row.parcaTuru.toLowerCase().trim() === "stres alma" ? (
                          <input
                            value=""
                            disabled
                            placeholder="Gerekmez"
                            className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 outline-none"
                          />
                        ) : (
                          <Cell value={row.genislik} onChange={(v) => updateRow(tip.id, idx, { genislik: v })} />
                        )}
                        <Cell value={row.sureDakika} onChange={(v) => updateRow(tip.id, idx, { sureDakika: v })} />
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => addRow(tip.id)} className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                    + Satır Ekle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hata && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{hata}</div>}

        <button
          type="button"
          onClick={hesapla}
          disabled={loading}
          className="mt-5 rounded-2xl bg-gradient-to-br from-slate-950 to-violet-950 px-6 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(15,23,42,0.22)] disabled:opacity-50"
        >
          {loading ? "Hesaplanıyor..." : "Damar Takipli Yerleşimi Hesapla"}
        </button>
      </section>

      {sonuclar.length > 0 && (
        <section className="grid gap-4 md:grid-cols-6">
          <Metric title="Toplam Plaka" value={`${toplamlar.toplamPlaka}`} />
          <Metric title="Toplam Maliyet" value={`€${toplamlar.toplamMaliyet.toFixed(2)}`} />
          <Metric title="Ortalama Fire" value={`%${toplamlar.agirlikliFire.toFixed(2)}`} />
          <Metric title="Fire Maliyeti" value={`€${toplamlar.fireMaliyeti.toFixed(2)}`} />
          <Metric title="Üretim Süresi" value={`${buildAktarSonucu().toplamSureDakika.toFixed(0)} dk`} />

          <button
            type="button"
            onClick={aktar}
            className="rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 p-5 text-left text-white shadow-[0_14px_40px_rgba(15,23,42,0.16)] transition hover:scale-[1.01]"
          >
            <p className="text-sm font-bold text-white/80">Yeni İş</p>
            <p className="mt-2 text-xl font-black">Bu Planı Kullan →</p>
          </button>
        </section>
      )}

      <section className="space-y-6">
        {sonuclar.map((result) => (
          <div key={result.tipId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{result.tipAdi} {result.desenAdi ? `— ${result.desenAdi}` : ""}</h3>
                <p className="mt-1 text-sm text-slate-500">{result.yorum}</p>
              </div>

              <div className="flex gap-2">
                <Pill label="Plaka" value={`${result.plakaSayisi}`} />
                <Pill label="Fire" value={`%${result.fireOrani.toFixed(2)}`} />
                <Pill label="Maliyet" value={`€${(result.plakaSayisi * result.plakaFiyati).toFixed(2)}`} />
              </div>
            </div>

            <div className="space-y-6">
              {result.slabs.map((slab) => (
                <div key={slab.index} className="overflow-x-auto rounded-3xl bg-slate-50 p-4">
                  <h4 className="mb-3 text-lg font-black text-slate-900">{result.tipAdi} / Plaka {slab.index + 1}</h4>

                  <div
                    onMouseMove={(e) => movePiece(e, result, slab.index)}
                    onMouseUp={() => setDragging(null)}
                    onMouseLeave={() => setDragging(null)}
                    className="relative overflow-hidden border-[3px] border-slate-950 bg-cover bg-center shadow-inner"
                    style={{
                      width: result.plakaGenislik * scale,
                      height: result.plakaYukseklik * scale,
                      backgroundImage: result.imageUrl
                        ? `url(${result.imageUrl})`
                        : "linear-gradient(135deg,#d9d0c0 0%,#f8f1e7 32%,#b8ad9d 58%,#efe4d2 100%)",
                    }}
                  >
                    {slab.yerlesim.map((p, pieceIndex) => (
                      <div
                        key={p.id}
                        onMouseDown={() => setDragging({ tipId: result.tipId, slabIndex: slab.index, pieceIndex })}
                        className="absolute flex cursor-grab flex-col items-center justify-center border-2 border-rose-600 bg-rose-500/25 p-1 text-center text-xs font-black text-slate-950 backdrop-blur-[1px]"
                        style={{
                          left: p.x * scale,
                          top: p.y * scale,
                          width: p.genislik * scale,
                          height: p.yukseklik * scale,
                        }}
                        title={p.damarGrubu || ""}
                      >
                        <span>{p.parcaTuru}</span>
                        <small>{p.genislik}x{p.yukseklik}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-black text-slate-600">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        inputMode="decimal"
        className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
      />
    </label>
  );
}

function Cell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type="text"
      inputMode="decimal"
      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
    />
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
