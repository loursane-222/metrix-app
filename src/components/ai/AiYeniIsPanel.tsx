"use client";

import { normalizeParsedOfferResult } from "@/lib/offer-ai-contract";
import { useRef, useState } from "react";

type Props = {
  onApply: (data: any) => void;
  onManual?: () => void;
};

type UploadedPlanFile = {
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  originalName: string;
};

function val(v: any) {
  if (v === undefined || v === null || v === "" || Number.isNaN(v)) return "-";
  return String(v);
}

function money(v: any) {
  const n = Number(v || 0);
  return n > 0 ? `€${n.toFixed(2)}` : "-";
}

function fileSize(v: number) {
  if (!Number.isFinite(v) || v <= 0) return "-";
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeText(v: string) {
  return String(v || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizePlakaDims(en: any, boy: any) {
  const a = Number(en || 320);
  const b = Number(boy || 160);
  return {
    genislik: Math.max(a, b),
    yukseklik: Math.min(a, b),
  };
}

function kontrolTipi(x: string) {
  const t = normalizeText(x);

  if (t.includes("musteri") && t.includes("adi")) return "musteri";
  if (t.includes("plaka") && (t.includes("fiyat") || t.includes("bedel"))) return "plakaFiyati";
  if (t.includes("plaka") && (t.includes("olcu") || t.includes("ölcu"))) return "plaka";
  if (t.includes("stokta") || t.includes("alinacak") || t.includes("musteriye")) return "tasDurumu";
  if (t.includes("urun") || t.includes("taş / urun") || t.includes("tas / urun") || t.includes("tas/urun")) return "urun";

  return "genel";
}

export default function AiYeniIsPanel({ onApply, onManual }: Props) {
  const [metin, setMetin] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  const [sonuc, setSonuc] = useState<any>(null);
  const [layout, setLayout] = useState<any>(null);
  const [hata, setHata] = useState("");
  const [plakaGorsel, setPlakaGorsel] = useState<string | null>(null);
  const [aktifKontrol, setAktifKontrol] = useState<any>(null);
  const [sonucModalAcik, setSonucModalAcik] = useState(false);
  const [plakaEn, setPlakaEn] = useState("320");
  const [plakaBoy, setPlakaBoy] = useState("160");
  const [urunAdiDraft, setUrunAdiDraft] = useState("");
  const [musteriAdiDraft, setMusteriAdiDraft] = useState("");
  const [plakaFiyatiDraft, setPlakaFiyatiDraft] = useState("");
  const [kurDraft, setKurDraft] = useState("53");
  const [planUpload, setPlanUpload] = useState<UploadedPlanFile | null>(null);
  const [uploadYukleniyor, setUploadYukleniyor] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const planInputRef = useRef<HTMLInputElement | null>(null);

  const parsed = sonuc ? normalizeParsedOfferResult(sonuc) : null;
  const kontrol = sonuc?.sistemKontrol;
  const plakaFiyati = Number(parsed?.malzeme?.plakaFiyatiEuro || 0);
  const plakaSayisi = Number(layout?.plakaSayisi || 0);
  const fireOrani = Number(layout?.fireOrani || 0);
  const toplamPlakaMaliyeti = plakaSayisi * plakaFiyati;
  const fireMaliyeti = (fireOrani / 100) * toplamPlakaMaliyeti;

  async function layoutHesapla(data: any, plakaOverride?: { enCm: number; boyCm: number }) {
    const parsedData = data?.sonuc || data || {};
    const olcu = plakaOverride || parsedData?.malzeme?.plakaOlcusu || {};

    const parcalar = (parsedData?.parcalar || [])
      .map((p: any, i: number) => ({
        id: i + 1,
        label: p.etiket || p.standartTip || `Parça ${i + 1}`,
        tipAdi: "AI",
        parcaTuru: p.standartTip,
        genislik: Number(p.boyCm || 0),
        yukseklik: Number(p.enCm || 0),
      }))
      .filter((p: any) => p.genislik > 0 && p.yukseklik > 0);

    if (parcalar.length === 0) return;

    const layoutRes = await fetch("/api/ai-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plaka: normalizePlakaDims(olcu?.enCm || 320, olcu?.boyCm || 160),
        pieces: parcalar,
      }),
    });

    const layoutData = await layoutRes.json();
    if (layoutData?.ok) setLayout(layoutData);
    return layoutData?.ok ? layoutData : null;
  }

  async function dikteBaslat() {
    setHata("");

    if (dinliyor) {
      // Kaydı durdur ve Whisper'a gönder
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setDinliyor(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) {
          setHata("Ses çok kısa, tekrar deneyin.");
          return;
        }

        setYukleniyor(true);
        try {
          const fd = new FormData();
          fd.append("audio", audioBlob, "ses.webm");
          const res = await fetch("/api/whisper", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Whisper hatası");
          if (data.metin) {
            setMetin((p) => p ? `${p} ${data.metin}` : data.metin);
          }
        } catch (e: any) {
          setHata(e?.message || "Ses tanıma hatası.");
        } finally {
          setYukleniyor(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setDinliyor(true);
    } catch (e: any) {
      setHata("Mikrofon erişimi reddedildi veya desteklenmiyor.");
    }
  }

  async function planDosyasiYukle(file?: File | null) {
    if (!file) return;

    setHata("");
    setUploadYukleniyor(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/uploads/plan", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.file) {
        throw new Error(data?.hata || data?.error || "Dosya yüklenemedi.");
      }

      setPlanUpload(data.file as UploadedPlanFile);
    } catch (e: any) {
      setPlanUpload(null);
      setHata(e?.message || "Dosya yüklenemedi.");
    } finally {
      setUploadYukleniyor(false);
      if (planInputRef.current) planInputRef.current.value = "";
    }
  }

  async function calistir() {
    if (!metin.trim()) {
      setHata("Önce işi anlatan bir metin gir.");
      return;
    }

    setYukleniyor(true);
    setHata("");
    setSonuc(null);
    setLayout(null);

    try {
      const res = await fetch("/api/yeni-is-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI parser hata verdi.");

      const en = String(data?.sonuc?.malzeme?.plakaOlcusu?.enCm || 320);
      const boy = String(data?.sonuc?.malzeme?.plakaOlcusu?.boyCm || 160);
      setPlakaEn(en);
      setPlakaBoy(boy);
      setUrunAdiDraft(data?.sonuc?.malzeme?.urunAdi || "");
      setMusteriAdiDraft(data?.sonuc?.musteri?.ad || data?.sonuc?.isBilgisi?.musteriAdi || "");
      setPlakaFiyatiDraft(String(data?.sonuc?.malzeme?.plakaFiyatiEuro || ""));
      setKurDraft(String(data?.sonuc?.malzeme?.kur || "53"));

      setSonuc(data);
      await layoutHesapla(data, { enCm: Number(en), boyCm: Number(boy) });
      setSonucModalAcik(true);
    } catch (e: any) {
      setHata(e?.message || "Bir hata oluştu.");
    } finally {
      setYukleniyor(false);
    }
  }

  function uygula() {
    if (!sonuc) return;

const plakaSayisiFix =
  layout?.plakaSayisi ||
  layout?.plaka_sayisi ||
  layout?.summary?.plakaSayisi ||
  layout?.summary?.plaka_sayisi ||
  0;

onApply({
  ...sonuc,
  plakaLayoutJson: {
    ...(layout || {}),
    plakaSayisi: plakaSayisiFix
  },
  plakaImageUrl: plakaGorsel || ""
});
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:rounded-[34px] md:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">
            Metrix AI Yeni İş
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-white md:mt-4 md:text-3xl">
            İşi konuş, sistem ölçüden maliyete hazırlasın
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 md:text-sm md:leading-6">
            Müşteri, ürün, plaka fiyatı, kur ve ölçüleri tek konuşmada alır. AI yorumlar, plaka yerleşimini hesaplar, sen onaylarsın.
          </p>
        </div>

        <button
          type="button"
          onClick={dikteBaslat}
          className={`w-full shrink-0 rounded-2xl px-5 py-3 text-sm font-black shadow-2xl transition md:w-auto ${
            dinliyor ? "bg-red-500 text-white shadow-red-500/30" : "border border-white/10 bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          {dinliyor ? "⏹️ Dikteyi Bitir" : "🎙️ Dikte Et"}
        </button>
      </div>

      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Örn: Yeni müşteri Mehmet Kaya için Calacatta porselen mutfak tezgahı, plaka 220 euro, kur 53, tezgah 285'e 65, tezgah arası 285'e 55, ön alın 4 cm..."
        className="min-h-[132px] w-full resize-none rounded-2xl border border-white/20 bg-black/65 p-4 text-sm leading-6 text-white outline-none md:min-h-[170px] md:rounded-3xl md:p-5 md:text-base md:leading-7
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30
placeholder:text-slate-500"
      />

      <div className="mt-4 grid grid-cols-1 gap-3 md:mt-5 md:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={calistir}
          disabled={yukleniyor}
          className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:scale-[1.01] disabled:opacity-60"
        >
          {yukleniyor ? "AI işi çözüyor..." : "AI Ölçü Çöz"}
        </button>

        <button
          type="button"
          onClick={onManual}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-black text-slate-200 transition hover:bg-white/10"
        >
          Manuel devam et
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:rounded-3xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Plan Dosyası
            </div>
            <div className="mt-1 text-sm font-bold text-white">PDF/Görsel Yükle</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              PDF, JPG veya PNG dosyasını güvenli şekilde yükler. Ölçü çözme bir sonraki adımda bağlanacak.
            </div>
          </div>

          <button
            type="button"
            onClick={() => planInputRef.current?.click()}
            disabled={uploadYukleniyor}
            className="w-full rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15 disabled:opacity-60 md:w-auto"
          >
            {uploadYukleniyor ? "Yükleniyor..." : "PDF/Görsel Yükle"}
          </button>
        </div>

        <input
          ref={planInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => planDosyasiYukle(e.target.files?.[0])}
        />

        {planUpload && (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-black text-emerald-200">Yükleme başarılı</div>
                <div className="mt-1 truncate text-sm font-black text-white">
                  {planUpload.originalName || "Plan dosyası"}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {planUpload.mimeType || "-"} · {fileSize(Number(planUpload.size || 0))}
                </div>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                Hazır
              </span>
            </div>
          </div>
        )}
      </div>

      {hata && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {hata}
        </div>
      )}

      {sonuc && !sonucModalAcik && (
        <button
          type="button"
          onClick={() => setSonucModalAcik(true)}
          style={{marginTop:"12px",width:"100%",padding:"14px",background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:"16px",color:"#fff",fontSize:"15px",fontWeight:900,cursor:"pointer",boxShadow:"0 6px 20px rgba(16,185,129,0.35)"}}
        >
          ✨ Sonucu Gör & Onayla →
        </button>
      )}

      {aktifKontrol && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#020617)] shadow-[0_35px_120px_rgba(0,0,0,0.75)]">
            <div className="border-b border-white/10 p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                Kontrol Düzeltme
              </div>
              <div className="mt-2 text-xl font-black text-white">{aktifKontrol.baslik}</div>
            </div>

            <div className="space-y-4 p-5">
              {aktifKontrol.tip === "tasDurumu" && (
                <div className="grid gap-3">
                  {[
                    ["stokta", "Taş stokta"],
                    ["alinacak", "Taş alınacak"],
                    ["musteriye_ait", "Müşteriye ait taş"],
                  ].map(([kod, label]) => (
                    <button
                      key={kod}
                      type="button"
                      onClick={() => {
                        setSonuc((prev: any) => ({
                          ...prev,
                          sonuc: {
                            ...(prev?.sonuc || {}),
                            malzeme: { ...(prev?.sonuc?.malzeme || {}), tasDurumu: kod },
                          },
                        }));
                        setAktifKontrol(null);
                      }}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left font-black text-white transition hover:border-emerald-300/50 hover:bg-emerald-400/10"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {aktifKontrol.tip === "plaka" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Plaka eni cm</div>
                    <input value={plakaEn} onChange={(e) => setPlakaEn(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Plaka boyu cm</div>
                    <input value={plakaBoy} onChange={(e) => setPlakaBoy(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const enCm = Number(String(plakaEn).replace(",", "."));
                      const boyCm = Number(String(plakaBoy).replace(",", "."));
                      if (!enCm || !boyCm) return alert("Plaka eni ve boyu zorunlu.");

                      const updated = {
                        ...sonuc,
                        sonuc: {
                          ...(sonuc?.sonuc || {}),
                          malzeme: {
                            ...(sonuc?.sonuc?.malzeme || {}),
                            plakaOlcusu: { enCm, boyCm },
                          },
                        },
                      };

                      setSonuc(updated);
                      await layoutHesapla(updated, { enCm, boyCm });
                      setAktifKontrol(null);
                    }}
                    className="md:col-span-2 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-4 font-black text-white shadow-[0_18px_45px_rgba(16,185,129,0.25)]"
                  >
                    Ölçüyü Kaydet ve Yerleşimi Yeniden Hesapla
                  </button>
                </div>
              )}

              {aktifKontrol.tip === "musteri" && (
                <div className="grid gap-3">
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Müşteri adı</div>
                    <input value={musteriAdiDraft} onChange={(e) => setMusteriAdiDraft(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const ad = musteriAdiDraft.trim();
                      if (!ad) return alert("Müşteri adı zorunlu.");

                      setSonuc((prev: any) => ({
                        ...prev,
                        sonuc: {
                          ...(prev?.sonuc || {}),
                          musteri: { ...(prev?.sonuc?.musteri || {}), ad },
                          isBilgisi: { ...(prev?.sonuc?.isBilgisi || {}), musteriAdi: ad },
                        },
                      }));
                      setAktifKontrol(null);
                    }}
                    className="rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-4 font-black text-white"
                  >
                    Müşteri Adını Kaydet
                  </button>
                </div>
              )}

              {aktifKontrol.tip === "plakaFiyati" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Plaka fiyatı €</div>
                    <input value={plakaFiyatiDraft} onChange={(e) => setPlakaFiyatiDraft(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">TL kur</div>
                    <input value={kurDraft} onChange={(e) => setKurDraft(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const fiyat = Number(String(plakaFiyatiDraft).replace(",", "."));
                      const kur = Number(String(kurDraft).replace(",", "."));
                      if (!fiyat) return alert("Plaka fiyatı zorunlu.");
                      if (!kur) return alert("TL kur zorunlu.");

                      setSonuc((prev: any) => ({
                        ...prev,
                        sonuc: {
                          ...(prev?.sonuc || {}),
                          malzeme: {
                            ...(prev?.sonuc?.malzeme || {}),
                            plakaFiyatiEuro: fiyat,
                            kur,
                          },
                        },
                      }));
                      setAktifKontrol(null);
                    }}
                    className="md:col-span-2 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-4 font-black text-white"
                  >
                    Fiyat ve Kuru Kaydet
                  </button>
                </div>
              )}

              {aktifKontrol.tip === "urun" && (
                <div className="grid gap-3">
                  <label className="block">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Taş / ürün adı</div>
                    <input value={urunAdiDraft} onChange={(e) => setUrunAdiDraft(e.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/60 p-4 font-black text-white outline-none
focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40
hover:border-white/40 transition shadow-inner shadow-black/30" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSonuc((prev: any) => ({
                        ...prev,
                        sonuc: {
                          ...(prev?.sonuc || {}),
                          malzeme: { ...(prev?.sonuc?.malzeme || {}), urunAdi: urunAdiDraft },
                        },
                      }));
                      setAktifKontrol(null);
                    }}
                    className="rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-4 font-black text-white"
                  >
                    Ürün Adını Kaydet
                  </button>
                </div>
              )}

              {aktifKontrol.tip === "genel" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  Bu bilgi için özel alan tanımlı değil. Manuel devam ederek formda düzeltebilirsin.
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setAktifKontrol(null)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-slate-200 transition hover:bg-white/[0.10]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sonuç Modalı */}
      {sonucModalAcik && parsed && (
        <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",flexDirection:"column",overflowY:"auto"}} onClick={() => setSonucModalAcik(false)}>
          <div style={{width:"100%",maxWidth:"720px",margin:"auto",padding:"20px 16px 40px",boxSizing:"border-box"}} onClick={e => e.stopPropagation()}>
            {/* Modal başlık */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div>
                <div style={{fontSize:"11px",fontWeight:900,letterSpacing:"0.2em",color:"#6ee7b7",textTransform:"uppercase",marginBottom:"4px"}}>AI Sonucu</div>
                <h2 style={{fontSize:"22px",fontWeight:900,color:"#fff",margin:0}}>Planı incele ve onayla</h2>
              </div>
              <button onClick={() => setSonucModalAcik(false)} style={{padding:"8px 16px",background:"#1f2937",border:"1px solid #374151",borderRadius:"12px",color:"#9ca3af",fontSize:"13px",cursor:"pointer"}}>✕ Kapat</button>
            </div>
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <InfoCard title="Müşteri" value={val(parsed?.musteri?.ad || parsed?.isBilgisi?.musteriAdi)} sub={parsed?.musteri?.tip === "yeni" ? "Yeni müşteri · onay bekler" : val(parsed?.musteri?.tip)} />
            <InfoCard title="Ürün" value={val(parsed?.malzeme?.urunAdi)} sub={val(parsed?.isBilgisi?.isAdi)} />
            <InfoCard title="Plaka Fiyatı" value={money(plakaFiyati)} sub="Euro" />
            <InfoCard title="Kur" value={val(parsed?.malzeme?.kur)} sub="TL / EUR" />
          </div>

          {kontrol?.eksikler?.length > 0 && (
            <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100 space-y-3">
              <div className="font-black">Kontrol gereken bilgiler</div>

              {kontrol.eksikler.map((x: string, i: number) => {
                const tip = kontrolTipi(x);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (tip === "urun") setUrunAdiDraft(parsed?.malzeme?.urunAdi || "");
                      if (tip === "musteri") setMusteriAdiDraft(parsed?.musteri?.ad || parsed?.isBilgisi?.musteriAdi || "");
                      if (tip === "plakaFiyati") {
                        setPlakaFiyatiDraft(String(parsed?.malzeme?.plakaFiyatiEuro || ""));
                        setKurDraft(String(parsed?.malzeme?.kur || "53"));
                      }
                      setAktifKontrol({ tip, baslik: x });
                    }}
                    className="group block w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-left font-black text-amber-50 transition hover:border-amber-300/50 hover:bg-black/55"
                  >
                    <span>{x}</span>
                    <span className="float-right text-xs text-amber-200/70 opacity-0 transition group-hover:opacity-100">Düzenle</span>
                  </button>
                );
              })}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-300">Plaka görseli</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPlakaGorsel(URL.createObjectURL(file));
                  }}
                  className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-black file:text-slate-950"
                />

                {plakaGorsel && (
                  <img
                    src={plakaGorsel}
                    alt="Plaka görseli"
                    className="mt-3 h-40 w-full max-w-xl rounded-2xl border border-white/10 object-cover"
                  />
                )}
              </div>
            </div>
          )}

          {layout && (
            <div className="rounded-[28px] border border-white/10 bg-black/35 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Plaka Yerleşimi</div>
                  <div className="mt-1 text-sm text-slate-400">Ön alın → tezgah → tezgah arası sırası üst dış kenardan korunarak hesaplandı.</div>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <MiniMetric label="Plaka" value={val(plakaSayisi)} />
                  <MiniMetric label="Fire" value={`%${fireOrani.toFixed(2)}`} />
                  <MiniMetric label="Fire maliyeti" value={money(fireMaliyeti)} />
                  <MiniMetric label="Plaka maliyeti" value={money(toplamPlakaMaliyeti)} />
                </div>
              </div>

              <div className="space-y-5">
                {(layout?.slabs || []).map((slab: any) => (
                  <div key={slab.index} className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                    <div className="mb-3 text-sm font-black text-white">Plaka {slab.index + 1}</div>
                    <div
                      className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(135deg,#d9d0c0,#f8f1e7,#b8ad9d,#efe4d2)]"
                      style={{
                        aspectRatio: `${Number(layout?.plaka?.genislik || 320)} / ${Number(layout?.plaka?.yukseklik || 160)}`,
                        backgroundImage: plakaGorsel ? `linear-gradient(rgba(255,255,255,0.20), rgba(255,255,255,0.20)), url(${plakaGorsel})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {(slab?.yerlesim || []).map((p: any) => (
                        <div
                          key={`${p.id}-${p.parcaTuru}-${p.x}-${p.y}`}
                          className="absolute flex items-center justify-center border border-rose-700/80 bg-rose-500/30 px-1 text-center text-[10px] font-black text-slate-950 backdrop-blur-[1px]"
                          style={{
                            left: `${(Number(p.x || 0) / Number(layout?.plaka?.genislik || 320)) * 100}%`,
                            top: `${(Number(p.y || 0) / Number(layout?.plaka?.yukseklik || 160)) * 100}%`,
                            width: `${(Number(p.genislik || 0) / Number(layout?.plaka?.genislik || 320)) * 100}%`,
                            height: `${(Number(p.yukseklik || 0) / Number(layout?.plaka?.yukseklik || 160)) * 100}%`,
                          }}
                        >
                          {p.parcaTuru || p.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"8px"}}>
            <button
              type="button"
              onClick={() => { uygula(); setSonucModalAcik(false); }}
              style={{padding:"16px",background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:"16px",color:"#fff",fontSize:"15px",fontWeight:900,cursor:"pointer",boxShadow:"0 8px 24px rgba(16,185,129,0.35)"}}
            >
              ✓ Bu planı kullan
            </button>
            <button
              type="button"
              onClick={() => { setSonucModalAcik(false); onManual && onManual(); }}
              style={{padding:"16px",background:"#111827",border:"1px solid #374151",borderRadius:"16px",color:"#d1d5db",fontSize:"15px",fontWeight:700,cursor:"pointer"}}
            >
              Manuel devam et
            </button>
          </div>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 truncate text-lg font-black text-white">{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  );
}
