import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Piece = {
  id: number;
  label: string;
  tipAdi?: string;
  parcaTuru?: string;
  sekilTipi?: "dikdortgen" | "oval" | "kapsul" | "l_parca" | "ozel_sablon";
  shapeNotu?: string;
  genislik: number;
  yukseklik: number;
  x?: number;
  y?: number;
  slabIndex?: number;
  damarGrubu?: string;
};

type Slab = {
  index: number;
  yerlesim: Piece[];
};

function norm(v?: string) {
  return String(v || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

function kind(piece: Piece): string {
  const raw = norm(`${piece.parcaTuru || ""} ${piece.label || ""}`);
  if (raw.includes("on alin")) return "on_alin";
  if (raw.includes("tezgah arasi")) return "tezgah_arasi";
  if (raw.includes("ada tezgah")) return "ada_tezgah";
  if (raw.includes("tezgah") && !raw.includes("arasi")) return "tezgah";
  if (raw.includes("ada ayak")) return "ada_ayak";
  if (raw.includes("supurgelik")) return "supurgelik";
  return raw.replace(/ /g, "_");
}

function kindOrder(k: string): number {
  if (k === "on_alin") return 1;
  if (k === "tezgah") return 2;
  if (k === "tezgah_arasi") return 3;
  return 9;
}

function normalizePlaka(input: { genislik: number; yukseklik: number }) {
  const a = Number(input?.genislik || 0);
  const b = Number(input?.yukseklik || 0);
  return { genislik: Math.max(a, b), yukseklik: Math.min(a, b) };
}

// ─── Ana paketleme algoritması ────────────────────────────────────────────────
// Mantık:
// 1. Setleri oluştur: her set = [ön alın?, tezgah?, tezgah arası?] kindOrder'a göre sıralı
// 2. Her set için mevcut plakada YETERLİ YÜKSEKLIK olan bir "şerit" ara
//    Şerit: plakanın tüm genişliğini kaplayan yatay bölge
//    Bir plakada birden fazla set üst üste dizilir (y ekseninde)
// 3. Set sığmıyorsa yeni plaka aç

type SetItem = Piece & { _kind: string };

function packPieces(
  plaka: { genislik: number; yukseklik: number },
  inputPieces: Piece[]
): Slab[] {

  // Türe göre ayır
  const onAlinlar: SetItem[] = [];
  const tezgahlar: SetItem[] = [];
  const tezgahArasilari: SetItem[] = [];
  const singles: SetItem[] = [];

  for (const p of inputPieces) {
    const k = kind(p);
    const pk = { ...p, _kind: k };
    if (k === "on_alin") onAlinlar.push(pk);
    else if (k === "tezgah") tezgahlar.push(pk);
    else if (k === "tezgah_arasi") tezgahArasilari.push(pk);
    else singles.push(pk);
  }

  // Setleri oluştur
  const maxSets = Math.max(onAlinlar.length, tezgahlar.length, tezgahArasilari.length, 1);
  const sets: SetItem[][] = [];
  for (let i = 0; i < maxSets; i++) {
    const set: SetItem[] = [];
    if (onAlinlar[i]) set.push(onAlinlar[i]);
    if (tezgahlar[i]) set.push(tezgahlar[i]);
    if (tezgahArasilari[i]) set.push(tezgahArasilari[i]);
    if (set.length) sets.push([...set].sort((a, b) => kindOrder(a._kind) - kindOrder(b._kind)));
  }

  // Her plaka için "dolu yükseklik" takip et (y ekseninde ne kadar doldu)
  // Her set plaka genişliğince yayılır (x=0'dan başlar, genislik=plakaGenislik)
  // Parçalar kendi genişliklerini korur ama x=0'dan yerleşir
  // Set yüksekliği = setteki parçaların yükseklik toplamı

  type SlabState = {
    index: number;
    yerlesim: (Piece & { _kind: string })[];
    doluyukseklik: number; // şimdiye kadar kullanılan y
  };

  const slabStates: SlabState[] = [];

  function yeniSlab(): SlabState {
    const s: SlabState = { index: slabStates.length, yerlesim: [], doluyukseklik: 0 };
    slabStates.push(s);
    return s;
  }

  function setYuksekligi(set: SetItem[]): number {
    return set.reduce((s, p) => s + p.yukseklik, 0);
  }

  function setGenisligi(set: SetItem[]): number {
    return Math.max(...set.map(p => p.genislik));
  }

  // Seti bir plakaya yerleştir
  function setYerlestir(slab: SlabState, set: SetItem[], startY: number) {
    let curY = startY;
    for (const p of set) {
      slab.yerlesim.push({
        ...p,
        x: 0,
        y: curY,
        slabIndex: slab.index,
        parcaTuru: p._kind,
        damarGrubu: `slab${slab.index}-y${startY}`,
      });
      curY += p.yukseklik;
    }
    slab.doluyukseklik = curY;
  }

  // Setleri yerleştir
  for (const set of sets) {
    const setH = setYuksekligi(set);
    const setW = setGenisligi(set);

    // Plakaya sığıp sığmadığını kontrol et
    if (setH > plaka.yukseklik || setW > plaka.genislik) {
      // Sığmıyor ama yine de yerleştir (hata göstergesi)
      if (!slabStates.length) yeniSlab();
      setYerlestir(slabStates[slabStates.length - 1], set, slabStates[slabStates.length - 1].doluyukseklik);
      continue;
    }

    // Mevcut plakalarda alt kısmında yeterli yer var mı?
    let yerlestirildi = false;
    for (const slab of slabStates) {
      const kalanY = plaka.yukseklik - slab.doluyukseklik;
      if (kalanY >= setH) {
        setYerlestir(slab, set, slab.doluyukseklik);
        yerlestirildi = true;
        break;
      }
    }

    if (!yerlestirildi) {
      const yeni = yeniSlab();
      setYerlestir(yeni, set, 0);
    }
  }

  // Singles — aynı mantıkla üst üste
  for (const piece of singles) {
    let yerlestirildi = false;
    for (const slab of slabStates) {
      const kalanY = plaka.yukseklik - slab.doluyukseklik;
      if (kalanY >= piece.yukseklik && piece.genislik <= plaka.genislik) {
        slab.yerlesim.push({
          ...piece,
          x: 0,
          y: slab.doluyukseklik,
          slabIndex: slab.index,
          parcaTuru: piece._kind,
          damarGrubu: `slab${slab.index}-single`,
        });
        slab.doluyukseklik += piece.yukseklik;
        yerlestirildi = true;
        break;
      }
    }
    if (!yerlestirildi) {
      const yeni = yeniSlab();
      yeni.yerlesim.push({
        ...piece,
        x: 0,
        y: 0,
        slabIndex: yeni.index,
        parcaTuru: piece._kind,
        damarGrubu: `slab${yeni.index}-single`,
      });
      yeni.doluyukseklik = piece.yukseklik;
    }
  }

  return slabStates
    .filter(s => s.yerlesim.length > 0)
    .map((s, index) => ({
      index,
      yerlesim: s.yerlesim.map(p => ({ ...p, slabIndex: index })),
    }));
}

export async function POST(req: Request) {
  try {
    const { plaka, pieces } = await req.json();

    if (!plaka?.genislik || !plaka?.yukseklik) {
      return NextResponse.json({ error: "Plaka ölçüsü eksik." }, { status: 400 });
    }
    if (!Array.isArray(pieces) || pieces.length === 0) {
      return NextResponse.json({ error: "Parça yok." }, { status: 400 });
    }

    const cleanPieces: Piece[] = pieces.map((p: Piece, i: number) => ({
      ...p,
      id: p.id || i + 1,
      genislik: Number(p.genislik || 0),
      yukseklik: Number(p.yukseklik || 0),
      label: p.label || p.parcaTuru || `Parça ${i + 1}`,
    }));

    const normalizedPlaka = normalizePlaka({
      genislik: Number(plaka.genislik),
      yukseklik: Number(plaka.yukseklik),
    });

    const slabs = packPieces(normalizedPlaka, cleanPieces);

    const toplamParcaAlani = cleanPieces.reduce(
      (sum, p) => sum + p.genislik * p.yukseklik, 0
    );
    const plakaAlani = normalizedPlaka.genislik * normalizedPlaka.yukseklik;
    const toplamPlakaAlani = slabs.length * plakaAlani;
    const fireOrani = toplamPlakaAlani > 0
      ? Math.max(0, ((toplamPlakaAlani - toplamParcaAlani) / toplamPlakaAlani) * 100)
      : 0;

    return NextResponse.json({
      ok: true,
      plaka: normalizedPlaka,
      slabs,
      plakaSayisi: slabs.length,
      toplamParcaAlani,
      toplamPlakaAlani,
      fireOrani: Number(fireOrani.toFixed(2)),
      yorum: `${slabs.length} plaka — ön alın dıştan içe, setler plaka alt kısmına üst üste yerleştirildi.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Layout hatası." }, { status: 500 });
  }
}
