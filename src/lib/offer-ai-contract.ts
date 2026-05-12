export type ParsedPieceKind =
  | "tezgah"
  | "tezgah_arasi"
  | "on_alin"
  | "ada_tezgah"
  | "ada_ayak"
  | "panel"
  | "diger";

export type ParsedPiece = {
  label: string;
  kind: ParsedPieceKind;
  lengthCm: number;
  widthCm: number;
  quantity: number;
  hasFrontEdge?: boolean;
  veinFollow?: boolean;
  note?: string;
  etiket?: string;
  standartTip?: string;
  boyCm?: number;
  enCm?: number;
  adet?: number;
  onAlin?: boolean;
  damarTakibi?: boolean;
  not?: string;
};

export type PlanLayoutResult = {
  slabSize: {
    widthCm: number;
    heightCm: number;
  };
  slabCount: number;
  wasteRatio: number;
  slabs: unknown[];
  totalPieceAreaCm2?: number;
  totalSlabAreaCm2?: number;
};

export type ParsedOfferResult = {
  source?: "text" | "voice" | "pdf" | "image";
  confidenceScore: number;
  customer: {
    name: string;
    type?: "mevcut" | "yeni" | "belirsiz";
    segment?: "son_kullanici" | "mimar" | "bayi" | "muteahhit" | "imalatci";
    phone?: string;
    note?: string;
  };
  job: {
    customerName: string;
    title?: string;
    type?: string;
  };
  material: {
    productName?: string;
    slabPriceEuro?: number;
    exchangeRate?: number;
    stoneStatus?: "stokta" | "alinacak" | "musteriye_ait" | "belirsiz";
    slabSize?: {
      widthCm: number;
      heightCm: number;
    };
  };
  pieces: ParsedPiece[];
  operations: unknown[];
  missingQuestions: string[];
  warnings: string[];
  layout?: PlanLayoutResult;
  sourceFile?: {
    url: string;
    publicId: string;
    mimeType: string;
    originalName: string;
  };
  musteri: {
    ad: string;
    tip?: "mevcut" | "yeni" | "belirsiz";
    musteriTipi?: "son_kullanici" | "mimar" | "bayi" | "muteahhit" | "imalatci";
    telefon?: string;
    not?: string;
  };
  isBilgisi: {
    musteriAdi: string;
    isAdi?: string;
    isTuru?: string;
  };
  malzeme: {
    marka?: string;
    seri?: string;
    renk?: string;
    urunAdi?: string;
    plakaFiyatiEuro?: number;
    kur?: number;
    kdvDahil?: boolean | null;
    tasDurumu?: "stokta" | "alinacak" | "musteriye_ait" | "belirsiz";
    plakaOlcusu?: {
      enCm?: number;
      boyCm?: number;
    };
  };
  parcalar: ParsedPiece[];
  operasyonlar: unknown[];
  eksikSorular: string[];
  uyarilar: string[];
  guvenSkoru: number;
};

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((x) => String(x)).filter(Boolean) : [];
}

function normalizePieceKind(value: unknown): ParsedPieceKind {
  const raw = String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, "_");

  if (raw.includes("on_alin")) return "on_alin";
  if (raw.includes("tezgah_arasi")) return "tezgah_arasi";
  if (raw.includes("ada_tezgah")) return "ada_tezgah";
  if (raw.includes("ada_ayak")) return "ada_ayak";
  if (raw.includes("panel")) return "panel";
  if (raw.includes("tezgah")) return "tezgah";
  return "diger";
}

function normalizeParsedPiece(value: unknown): ParsedPiece {
  const piece = asObject(value);
  const standartTip = asString(piece.standartTip || piece.kind || piece.parcaTuru, "");
  const label = asString(piece.etiket || piece.label || standartTip, "Parça");
  const lengthCm = asNumber(piece.boyCm ?? piece.lengthCm ?? piece.uzunluk, 0);
  const widthCm = asNumber(piece.enCm ?? piece.widthCm ?? piece.genislik, 0);
  const quantity = asNumber(piece.adet ?? piece.quantity, 1) || 1;
  const hasFrontEdge = Boolean(piece.onAlin ?? piece.hasFrontEdge);
  const veinFollow = Boolean(piece.damarTakibi ?? piece.veinFollow);
  const note = asString(piece.not ?? piece.note, "");

  return {
    ...piece,
    label,
    kind: normalizePieceKind(standartTip),
    lengthCm,
    widthCm,
    quantity,
    hasFrontEdge,
    veinFollow,
    note,
    etiket: asString(piece.etiket, label),
    standartTip,
    boyCm: lengthCm,
    enCm: widthCm,
    adet: quantity,
    onAlin: hasFrontEdge,
    damarTakibi: veinFollow,
    not: note,
  };
}

export function normalizeParsedOfferResult(raw: unknown): ParsedOfferResult {
  const root = asObject(raw);
  const data = asObject(root.sonuc || root);
  const musteri = asObject(data.musteri);
  const isBilgisi = asObject(data.isBilgisi);
  const malzeme = asObject(data.malzeme);
  const plakaOlcusu = asObject(malzeme.plakaOlcusu);
  const parcalar = Array.isArray(data.parcalar)
    ? data.parcalar.map(normalizeParsedPiece)
    : [];

  const musteriAdi = asString(musteri.ad || isBilgisi.musteriAdi, "");
  const guvenSkoru = asNumber(data.guvenSkoru ?? data.confidenceScore, 0);
  const eksikSorular = asStringArray(data.eksikSorular);
  const uyarilar = asStringArray(data.uyarilar);

  return {
    ...data,
    source: data.source,
    confidenceScore: guvenSkoru,
    customer: {
      name: musteriAdi,
      type: musteri.tip,
      segment: musteri.musteriTipi,
      phone: musteri.telefon,
      note: musteri.not,
    },
    job: {
      customerName: asString(isBilgisi.musteriAdi || musteriAdi, ""),
      title: isBilgisi.isAdi,
      type: isBilgisi.isTuru,
    },
    material: {
      productName: malzeme.urunAdi,
      slabPriceEuro: asNumber(malzeme.plakaFiyatiEuro, 0),
      exchangeRate: asNumber(malzeme.kur, 0),
      stoneStatus: malzeme.tasDurumu,
      slabSize: {
        widthCm: asNumber(plakaOlcusu.enCm, 0),
        heightCm: asNumber(plakaOlcusu.boyCm, 0),
      },
    },
    pieces: parcalar,
    operations: Array.isArray(data.operasyonlar) ? data.operasyonlar : [],
    missingQuestions: eksikSorular,
    warnings: uyarilar,
    layout: data.layout,
    sourceFile: data.sourceFile,
    musteri: {
      ...musteri,
      ad: musteriAdi,
    },
    isBilgisi: {
      ...isBilgisi,
      musteriAdi: asString(isBilgisi.musteriAdi || musteriAdi, ""),
    },
    malzeme: {
      ...malzeme,
      plakaFiyatiEuro: asNumber(malzeme.plakaFiyatiEuro, 0),
      kur: asNumber(malzeme.kur, 0),
      plakaOlcusu: {
        ...plakaOlcusu,
        enCm: asNumber(plakaOlcusu.enCm, 0),
        boyCm: asNumber(plakaOlcusu.boyCm, 0),
      },
    },
    parcalar,
    operasyonlar: Array.isArray(data.operasyonlar) ? data.operasyonlar : [],
    eksikSorular,
    uyarilar,
    guvenSkoru,
  };
}
