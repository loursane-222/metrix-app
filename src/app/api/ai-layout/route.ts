import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Piece = {
  id: number;
  label: string;
  tipAdi?: string;
  parcaTuru?: string;
  genislik: number;
  yukseklik: number;
  x?: number;
  y?: number;
  slabIndex?: number;
  damarGrubu?: string;
  oncelik?: number;
};

type Slab = {
  index: number;
  yerlesim: Piece[];
};

const tezgahSetParts = [
  "tezgah",
  "tezgah arası",
  "ön alın",
  "l dönüş tezgah",
  "l tezgah arası",
  "l ön alın",
];

const highVeinParts = new Set([
  ...tezgahSetParts,
  "ada tezgah",
  "ada ayak",
  "ada iç dönüş",
  "ada dış dönüş",
  "tezgah ayak",
]);

function norm(v?: string) {
  return (v || "").toLowerCase().trim();
}

function getVeinGroup(piece: Piece) {
  const t = norm(piece.parcaTuru);

  if (tezgahSetParts.includes(t)) {
    return `${piece.tipAdi || piece.label}-tezgah-grubu`;
  }

  if (["ada tezgah", "ada ayak", "ada iç dönüş", "ada dış dönüş"].includes(t)) {
    return `${piece.tipAdi || piece.label}-ada-grubu`;
  }

  if (t === "davlumbaz") {
    return `${piece.tipAdi || piece.label}-duvar-grubu`;
  }

  return `${piece.tipAdi || piece.label}-serbest`;
}

function getSetKey(piece: Piece) {
  const t = norm(piece.parcaTuru);
  if (!tezgahSetParts.includes(t)) return "";

  const label = piece.label || "";

  // Örnek label:
  // "Tip-1-1 / tezgah"
  // "Tip-1-2 / ön alın"
  // Burada amaç Tip-1-1, Tip-1-2 gibi her mutfağı ayrı damar seti yapmak.
  const beforeSlash = label.split("/")[0]?.trim();

  if (beforeSlash) {
    return `${beforeSlash}-damar-seti`;
  }

  return `${piece.tipAdi || "tip"}-${piece.id}-damar-seti`;
}

function getPriority(piece: Piece) {
  const t = norm(piece.parcaTuru);

  if (t === "ada tezgah") return 100;
  if (t === "tezgah") return 95;
  if (t === "l dönüş tezgah") return 94;
  if (t === "tezgah arası") return 90;
  if (t === "l tezgah arası") return 89;
  if (t === "ön alın") return 88;
  if (t === "l ön alın") return 87;
  if (t === "ada ayak") return 86;
  if (t === "ada iç dönüş") return 84;
  if (t === "ada dış dönüş") return 83;
  if (t === "tezgah ayak") return 78;
  if (t === "davlumbaz") return 70;
  if (t === "süpürgelik") return 20;

  return 50;
}

function canRotate(piece: Piece) {
  return !highVeinParts.has(norm(piece.parcaTuru));
}

function normalizePieces(pieces: Piece[]) {
  return pieces.map((p) => ({
    ...p,
    damarGrubu: getVeinGroup(p),
    oncelik: getPriority(p),
  }));
}

function overlaps(a: Piece, b: Piece) {
  const ax = a.x || 0;
  const ay = a.y || 0;
  const bx = b.x || 0;
  const by = b.y || 0;

  return !(
    ax + a.genislik <= bx ||
    bx + b.genislik <= ax ||
    ay + a.yukseklik <= by ||
    by + b.yukseklik <= ay
  );
}

function fits(
  plaka: { genislik: number; yukseklik: number },
  slab: Slab,
  piece: Piece
) {
  const x = piece.x || 0;
  const y = piece.y || 0;

  if (x < 0 || y < 0) return false;
  if (x + piece.genislik > plaka.genislik) return false;
  if (y + piece.yukseklik > plaka.yukseklik) return false;

  return !slab.yerlesim.some((p) => overlaps(piece, p));
}

function placeSingleOnSlab(
  plaka: { genislik: number; yukseklik: number },
  slab: Slab,
  piece: Piece
) {
  const step = 5;

  const variants = [
    { ...piece },
    ...(canRotate(piece)
      ? [{ ...piece, genislik: piece.yukseklik, yukseklik: piece.genislik }]
      : []),
  ];

  for (const variant of variants) {
    for (let y = 0; y <= plaka.yukseklik - variant.yukseklik; y += step) {
      for (let x = 0; x <= plaka.genislik - variant.genislik; x += step) {
        const candidate = { ...variant, x, y, slabIndex: slab.index };
        if (fits(plaka, slab, candidate)) return candidate;
      }
    }
  }

  return null;
}


function getSetLayouts(setItems: Piece[]) {
  const orderWeight = (p: Piece) => {
    const t = norm(p.parcaTuru);

    // Gerçek kesim sırası:
    // Plakanın dışından: ön alın -> tezgah -> tezgah arası
    if (t === "ön alın" || t === "l ön alın") return 1;
    if (t === "tezgah" || t === "l dönüş tezgah") return 2;
    if (t === "tezgah arası" || t === "l tezgah arası") return 3;

    return 9;
  };

  const ordered = [...setItems].sort((a, b) => orderWeight(a) - orderWeight(b));

  // Ana damar layout: üstten alta boşluksuz.
  // Böylece ön alın tezgaha, tezgah da tezgah arasına öpüşür.
  let y = 0;
  const verticalKissing = ordered.map((p) => {
    const item = { ...p, x: 0, y };
    y += p.yukseklik;
    return item;
  });

  // Yedek layout: eğer dikey blok sığmazsa yan yana dene.
  let x = 0;
  const horizontalFallback = ordered.map((p) => {
    const item = { ...p, x, y: 0 };
    x += p.genislik;
    return item;
  });

  return [verticalKissing, horizontalFallback];
}


function setFitsAt(
  plaka: { genislik: number; yukseklik: number },
  slab: Slab,
  layout: Piece[],
  startX: number,
  startY: number
) {
  const moved = layout.map((p) => ({
    ...p,
    x: (p.x || 0) + startX,
    y: (p.y || 0) + startY,
    slabIndex: slab.index,
    damarGrubu: getSetKey(p) || p.damarGrubu,
  }));

  const maxX = Math.max(...moved.map((p) => (p.x || 0) + p.genislik));
  const maxY = Math.max(...moved.map((p) => (p.y || 0) + p.yukseklik));

  if (maxX > plaka.genislik || maxY > plaka.yukseklik) return null;

  for (const piece of moved) {
    if (!fits(plaka, slab, piece)) return null;
  }

  return moved;
}

function placeSetOnSlab(
  plaka: { genislik: number; yukseklik: number },
  slab: Slab,
  setItems: Piece[]
) {
  const layouts = getSetLayouts(setItems);
  const step = 5;

  for (const layout of layouts) {
    const layoutW = Math.max(...layout.map((p) => (p.x || 0) + p.genislik));
    const layoutH = Math.max(...layout.map((p) => (p.y || 0) + p.yukseklik));

    if (layoutW > plaka.genislik || layoutH > plaka.yukseklik) continue;

    for (let y = 0; y <= plaka.yukseklik - layoutH; y += step) {
      for (let x = 0; x <= plaka.genislik - layoutW; x += step) {
        const candidate = setFitsAt(plaka, slab, layout, x, y);
        if (candidate) return candidate;
      }
    }
  }

  return null;
}

function groupPiecesForVeinSets(pieces: Piece[]) {
  const sets = new Map<string, Piece[]>();
  const singles: Piece[] = [];

  for (const piece of normalizePieces(pieces)) {
    const key = getSetKey(piece);
    if (!key) {
      singles.push(piece);
      continue;
    }

    if (!sets.has(key)) sets.set(key, []);
    sets.get(key)!.push(piece);
  }

  return {
    veinSets: Array.from(sets.entries()).map(([key, items]) => ({ key, items })),
    singles,
  };
}

function placeSinglePiece(
  plaka: { genislik: number; yukseklik: number },
  slabs: Slab[],
  piece: Piece
) {
  for (const slab of slabs) {
    const candidate = placeSingleOnSlab(plaka, slab, piece);
    if (candidate) {
      slab.yerlesim.push(candidate);
      return;
    }
  }

  const newSlab: Slab = { index: slabs.length, yerlesim: [] };
  const candidate = placeSingleOnSlab(plaka, newSlab, piece);

  if (candidate) {
    newSlab.yerlesim.push(candidate);
  } else {
    newSlab.yerlesim.push({
      ...piece,
      x: 0,
      y: 0,
      slabIndex: newSlab.index,
      label: piece.label + " / PLAKAYA SIĞMIYOR",
    });
  }

  slabs.push(newSlab);
}

function packPieces(plaka: { genislik: number; yukseklik: number }, inputPieces: Piece[]) {
  const { veinSets, singles } = groupPiecesForVeinSets(inputPieces);
  const slabs: Slab[] = [];

  const sortedSets = veinSets.sort((a, b) => {
    const areaA = a.items.reduce((sum, p) => sum + p.genislik * p.yukseklik, 0);
    const areaB = b.items.reduce((sum, p) => sum + p.genislik * p.yukseklik, 0);
    return areaB - areaA;
  });

  for (const set of sortedSets) {
    let placed = false;

    for (const slab of slabs) {
      const candidate = placeSetOnSlab(plaka, slab, set.items);
      if (candidate) {
        slab.yerlesim.push(...candidate);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newSlab: Slab = { index: slabs.length, yerlesim: [] };
      const candidate = placeSetOnSlab(plaka, newSlab, set.items);

      if (candidate) {
        newSlab.yerlesim.push(...candidate);
        slabs.push(newSlab);
      } else {
        for (const piece of set.items) {
          placeSinglePiece(plaka, slabs, {
            ...piece,
            label: piece.label + " / SET BÖLÜNDÜ",
          });
        }
      }
    }
  }

  const sortedSingles = singles.sort((a, b) => {
    if ((b.oncelik || 0) !== (a.oncelik || 0)) return (b.oncelik || 0) - (a.oncelik || 0);
    return b.genislik * b.yukseklik - a.genislik * a.yukseklik;
  });

  for (const piece of sortedSingles) {
    placeSinglePiece(plaka, slabs, piece);
  }

  return slabs.filter((s) => s.yerlesim.length > 0).map((s, index) => ({
    index,
    yerlesim: s.yerlesim.map((p) => ({ ...p, slabIndex: index })),
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

    const slabs = packPieces(plaka, pieces);

    const toplamParcaAlani = pieces.reduce(
      (sum: number, p: Piece) => sum + p.genislik * p.yukseklik,
      0
    );

    const plakaAlani = plaka.genislik * plaka.yukseklik;
    const toplamPlakaAlani = slabs.length * plakaAlani;
    const fireOrani =
      toplamPlakaAlani > 0
        ? Math.max(0, ((toplamPlakaAlani - toplamParcaAlani) / toplamPlakaAlani) * 100)
        : 0;

    const damarGruplari = Array.from(
      new Set(slabs.flatMap((s) => s.yerlesim.map((p) => p.damarGrubu || "")))
    ).filter(Boolean);

    return NextResponse.json({
      ok: true,
      slabs,
      plakaSayisi: slabs.length,
      toplamParcaAlani,
      toplamPlakaAlani,
      fireOrani: Number(fireOrani.toFixed(2)),
      damarGruplari,
      yorum: `${slabs.length} plaka üzerinde taşmadan yerleşim yapıldı. Damar takibi için ${damarGruplari.length} ilişki grubu dikkate alındı. Fire oranı yaklaşık %${fireOrani.toFixed(2)}.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI layout hatası." }, { status: 500 });
  }
}
