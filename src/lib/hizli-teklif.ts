export type IsModeli = "tam" | "sadece_iscilik" | "fason";
export type MutfakTipi = "duz" | "l" | "u" | "paralel" | "coffee" | "ozel";

export interface Parca {
  id: string;
  ad: string;
  en: string;
  boy: string;
  adet: string;
  onAlin: boolean;
  tip: "tezgah" | "panel" | "ada" | "tezgah_arasi" | "ozel";
}

export interface FormState {
  musteriId: string;
  musteriAdi: string;
  musteriTipi: string;
  isTarihi: string;
  urunAdi: string;
  isModeli: IsModeli;
  mutfakTipi: MutfakTipi;
  parcalar: Parca[];
  eviyes: string;
  ocaklar: string;
  prizler: string;
  pahlamaMtul: string;
  kesim45Mtul: string;
  plakaFiyati: string;
  plakaFiyatiEuro: string;
  kullanilanKur: string;
  plakaEn: string;
  plakaBoy: string;
  plakaLayoutJson: any;
  plakaImageUrl: string;
  carpan: string;
  karHedefi: string;
  fiyatModu: "carpan" | "kar";
  manuelBirimFiyat: string;
  tezgahMakineId: string;
  tezgahDakika: string;
  pahlamaMakineId: string;
  pahlamaDakika: string;
  kesim45MakineId: string;
  kesim45Dakika: string;
  notlar: string;
  onAlinEnOverride?: Record<string, string>;
}

export function n(v: any): number {
  const x = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

export function tl(v: number) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

export function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function defaultParcalar(tip: MutfakTipi): Parca[] {
  const p = (ad: string, t: Parca["tip"]): Parca => ({
    id: uid(),
    ad,
    en: "",
    boy: "",
    adet: "1",
    onAlin: t === "tezgah" || t === "ada",
    tip: t,
  });

  switch (tip) {
    case "duz": return [p("Tezgah", "tezgah")];
    case "l": return [p("Ana Tezgah", "tezgah"), p("Yan Tezgah", "tezgah")];
    case "u": return [p("Ana Tezgah", "tezgah"), p("Sol Tezgah", "tezgah"), p("Sağ Tezgah", "tezgah")];
    case "paralel": return [p("Ana Tezgah", "tezgah"), p("Karşı Tezgah", "tezgah")];
    case "coffee": return [p("Ana Tezgah", "tezgah"), p("Coffee Corner", "ada")];
    case "ozel": return [p("Parça 1", "ozel")];
    default: return [p("Tezgah", "tezgah")];
  }
}

export function defaultForm(): FormState {
  return {
    musteriId: "",
    musteriAdi: "",
    musteriTipi: "Ev sahibi",
    isTarihi: new Date().toISOString().slice(0, 10),
    urunAdi: "",
    isModeli: "tam",
    mutfakTipi: "duz",
    parcalar: defaultParcalar("duz"),
    eviyes: "1",
    ocaklar: "1",
    prizler: "2",
    pahlamaMtul: "",
    kesim45Mtul: "",
    plakaFiyati: "",
    plakaFiyatiEuro: "",
    kullanilanKur: "53",
    plakaEn: "160",
    plakaBoy: "320",
    plakaLayoutJson: null,
    plakaImageUrl: "",
    carpan: "3.0",
    karHedefi: "30",
    fiyatModu: "carpan",
    manuelBirimFiyat: "",
    tezgahMakineId: "",
    tezgahDakika: "25",
    pahlamaMakineId: "",
    pahlamaDakika: "1",
    kesim45MakineId: "",
    kesim45Dakika: "4",
    notlar: "",
  };
}

export function normalizeParcaTuru(ad: string): string {
  const s = ad.toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();

  if (s.includes("on alin") || s.includes("ön alın")) return "ön alın";
  if (s.includes("tezgah arasi") || s.includes("tezgah arası")) return "tezgah arası";
  if (s.includes("ada tezgah")) return "ada tezgah";
  if (s.includes("ada ayak")) return "ada ayak";
  if (s.includes("tezgah")) return "tezgah";
  if (s.includes("panel")) return "tezgah arası";
  if (s.includes("supurgelik") || s.includes("süpürgelik")) return "süpürgelik";
  if (s.includes("davlumbaz")) return "davlumbaz";
  return "tezgah";
}

export function hesapla(form: FormState, makineler: any[]) {
  const makineMaliyet = (id: string) => {
    const m = makineler.find((x) => x.id === id);
    return Number(m?.dakikalikMaliyet ?? m?.dkMaliyet ?? m?.dakikaMaliyet ?? m?.hesaplananDakikaMaliyeti ?? 0) || 106;
  };

  let toplamMtul = 0;
  let toplamOnAlinMtul = 0;
  for (const p of form.parcalar) {
    const en = n(p.en);
    const boy = n(p.boy);
    const adet = n(p.adet) || 1;
    if (en > 0 && boy > 0) {
      const mtul = (boy / 100) * adet;
      toplamMtul += mtul;
      if (p.onAlin) toplamOnAlinMtul += mtul;
    }
  }

  const plakaEn = n(form.plakaEn) || 160;
  const plakaBoy = n(form.plakaBoy) || 320;
  const plakaAlani = plakaEn * plakaBoy;

  let toplamParcaAlani = 0;
  for (const p of form.parcalar) {
    const en = n(p.en);
    const boy = n(p.boy);
    const adet = n(p.adet) || 1;
    if (en > 0 && boy > 0) toplamParcaAlani += en * boy * adet;
  }

  const plakaSayisi = form.plakaLayoutJson?.plakaSayisi > 0
    ? Number(form.plakaLayoutJson.plakaSayisi)
    : plakaAlani > 0 && toplamParcaAlani > 0
      ? Math.ceil(toplamParcaAlani / (plakaAlani * 0.75))
      : 0;

  const plakaFiyatiTl = n(form.plakaFiyati) > 0
    ? n(form.plakaFiyati)
    : n(form.plakaFiyatiEuro) * n(form.kullanilanKur);

  const malzemeMaliyeti = form.isModeli === "tam" ? plakaSayisi * plakaFiyatiTl : 0;
  const tezgahDk = toplamMtul * n(form.tezgahDakika || "25");
  const pahlamaDk = n(form.pahlamaMtul) * n(form.pahlamaDakika || "1");
  const kesim45Dk = n(form.kesim45Mtul) * n(form.kesim45Dakika || "4");
  const toplamDakika = tezgahDk + pahlamaDk + kesim45Dk;

  const iscilikMaliyeti =
    tezgahDk * makineMaliyet(form.tezgahMakineId) +
    pahlamaDk * makineMaliyet(form.pahlamaMakineId) +
    kesim45Dk * makineMaliyet(form.kesim45MakineId);

  const toplamMaliyet = malzemeMaliyeti + iscilikMaliyeti;

  let satisFiyati = 0;
  if (form.manuelBirimFiyat && n(form.manuelBirimFiyat) > 0) {
    satisFiyati = n(form.manuelBirimFiyat) * toplamMtul;
  } else if (form.fiyatModu === "carpan") {
    satisFiyati = form.isModeli === "tam"
      ? malzemeMaliyeti * n(form.carpan)
      : iscilikMaliyeti * n(form.carpan);
  } else {
    satisFiyati = toplamMaliyet * (1 + n(form.karHedefi) / 100);
  }

  const kar = satisFiyati - toplamMaliyet;
  const karYuzde = toplamMaliyet > 0 ? (kar / toplamMaliyet) * 100 : 0;
  const birimFiyat = toplamMtul > 0 ? satisFiyati / toplamMtul : 0;
  const eviyeMaliyet = n(form.eviyes) * 200 * makineMaliyet(form.tezgahMakineId);
  const ocakMaliyet = n(form.ocaklar) * 150 * makineMaliyet(form.tezgahMakineId);

  return {
    toplamMtul,
    toplamOnAlinMtul,
    toplamParcaAlani,
    plakaSayisi,
    plakaFiyatiTl,
    malzemeMaliyeti,
    iscilikMaliyeti,
    toplamMaliyet,
    satisFiyati,
    kar,
    karYuzde,
    birimFiyat,
    toplamDakika,
    eviyeMaliyet,
    ocakMaliyet,
  };
}
