"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlakaPlanlayiciV2, type AIPlakaAktarSonucu } from "@/components/plaka-planlayici/PlakaPlanlayiciV2";

function n(v: string | number) {
  const x = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function para(v: number) {
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + "₺";
}

export default function YeniIsV3Page() {
  const router = useRouter();

  const [aktifBolum, setAktifBolum] = useState<"musteri" | "malzeme" | "maliyet" | "not">("musteri");
  const [plakaAcik, setPlakaAcik] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sonKayitModalAcik, setSonKayitModalAcik] = useState(false)
  const [sonKayitTeklifNo, setSonKayitTeklifNo] = useState("")
  const [sonKayitIsId, setSonKayitIsId] = useState("");
  const [hesapPopupAcik, setHesapPopupAcik] = useState(false);
  const [duzenlenmis, setDuzenlenmis] = useState<any>(null);
  const [musteriler, setMusteriler] = useState<any[]>([]);
  const [makineler, setMakineler] = useState<any[]>([]);
  const [musteriListeAcik, setMusteriListeAcik] = useState(false);

  const [form, setForm] = useState({
    musteriId: "",
    musteriAdi: "",
    urunAdi: "",
    malzemeTipi: "Porselen",
    musteriTipi: "Ev sahibi",
    isTarihi: new Date().toISOString().slice(0, 10),

    kullanilanKur: "53",
    karYuzdesi: "30",

    plakaFiyatiEuro: "",
    plakaGenislikCm: "",
    plakaUzunlukCm: "",
    manuelPlakaSayisi: "",
    plakadanAlinanMtul: "5",

    metrajMtul: "",
    birMtulDakika: "25",
    tezgahArasiMtul: "",
    tezgahArasiDakika: "18",
    adaTezgahMtul: "",
    adaTezgahDakika: "30",

    ozelIscilik1Mtul: "",
    ozelIscilik1Dakika: "",
    ozelIscilik2Mtul: "",
    ozelIscilik2Dakika: "",
    ozelIscilik3Mtul: "",
    ozelIscilik3Dakika: "",

    tezgahMakineId: "",
    tezgahArasiMakineId: "",
    adaMakineId: "",
    stresAlmaMakineId: "",
    fasonEbatlamaMakineId: "",

    kesim45Mtul: "",
    kesim45Dakika: "4",
    kesim45MakineId: "",

    pahlamaMtul: "",
    pahlamaDakika: "1",
    pahlamaMakineId: "",

    yapistirmaMtul: "",
    yapistirmaDakika: "8",
    yapistirmaMakineId: "",

    notlar: "",
  });

  useEffect(() => {
    fetch("/api/musteriler-lite")
      .then((r) => r.json())
      .then((v) => setMusteriler(v.musteriler || []));

    fetch("/api/makineler-lite")
      .then((r) => r.json())
      .then((v) => {
        const liste = v.makineler || [];
        setMakineler(liste);

        if (liste.length > 0) {
          setForm((p) => ({
            ...p,
            tezgahMakineId: p.tezgahMakineId || liste[0].id,
            tezgahArasiMakineId: p.tezgahArasiMakineId || liste[0].id,
            adaMakineId: p.adaMakineId || liste[0].id,
            stresAlmaMakineId: p.stresAlmaMakineId || liste[0].id,
            fasonEbatlamaMakineId: p.fasonEbatlamaMakineId || liste[0].id,
            kesim45MakineId: p.kesim45MakineId || liste[0].id,
            pahlamaMakineId: p.pahlamaMakineId || liste[0].id,
            yapistirmaMakineId: p.yapistirmaMakineId || liste[0].id,
          }));
        }
      });
  }, []);

  function setAlan(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function musteriSec(m: any) {
    setForm((p) => ({
      ...p,
      musteriId: m.id,
      musteriAdi: m.ad,
    }));
    setMusteriListeAcik(false);
  }

  function makineMaliyet(id: string) {
    const m = makineler.find((x) => x.id === id);
    return Number(m?.dakikalikMaliyet || 0);
  }

  function aiAktar(sonuc: AIPlakaAktarSonucu) {
    setForm((p) => ({
      ...p,
      manuelPlakaSayisi: String(sonuc.toplamPlaka || ""),
      plakaFiyatiEuro: sonuc.ortalamaPlakaFiyati ? String(sonuc.ortalamaPlakaFiyati) : p.plakaFiyatiEuro,
      plakaGenislikCm: sonuc.plakaGenislik ? String(sonuc.plakaGenislik) : p.plakaGenislikCm,
      plakaUzunlukCm: sonuc.plakaYukseklik ? String(sonuc.plakaYukseklik) : p.plakaUzunlukCm,

      metrajMtul: sonuc.tezgahMtul ? String(sonuc.tezgahMtul) : p.metrajMtul,
      tezgahArasiMtul: sonuc.tezgahArasiMtul ? String(sonuc.tezgahArasiMtul) : p.tezgahArasiMtul,
      adaTezgahMtul: sonuc.adaTezgahMtul ? String(sonuc.adaTezgahMtul) : p.adaTezgahMtul,

      ozelIscilik1Mtul: sonuc.stresAlmaMtul ? String(sonuc.stresAlmaMtul) : p.ozelIscilik1Mtul,
      ozelIscilik1Dakika: sonuc.stresAlmaDakika ? String(sonuc.stresAlmaDakika) : p.ozelIscilik1Dakika,
      ozelIscilik2Mtul: sonuc.fasonEbatlamaMtul ? String(sonuc.fasonEbatlamaMtul) : p.ozelIscilik2Mtul,
      ozelIscilik2Dakika: sonuc.fasonEbatlamaDakika ? String(sonuc.fasonEbatlamaDakika) : p.ozelIscilik2Dakika,
    }));

    setPlakaAcik(false);
    setAktifBolum("maliyet");
  }

  const hesap = useMemo(() => {
    const toplamMtul =
      n(form.metrajMtul) +
      n(form.tezgahArasiMtul) +
      n(form.adaTezgahMtul) +
      n(form.ozelIscilik1Mtul) +
      n(form.ozelIscilik2Mtul) +
      n(form.ozelIscilik3Mtul);

    const tezgahDakikaToplam = n(form.metrajMtul) * n(form.birMtulDakika);
    const tezgahArasiDakikaToplam = n(form.tezgahArasiMtul) * n(form.tezgahArasiDakika);
    const adaDakikaToplam = n(form.adaTezgahMtul) * n(form.adaTezgahDakika);
    const stresAlmaDakikaToplam = n(form.ozelIscilik1Mtul) * n(form.ozelIscilik1Dakika);
    const fasonEbatlamaDakikaToplam = n(form.ozelIscilik2Mtul) * n(form.ozelIscilik2Dakika);
    const kesim45DakikaToplam = n(form.kesim45Mtul) * n(form.kesim45Dakika);
    const pahlamaDakikaToplam = n(form.pahlamaMtul) * n(form.pahlamaDakika);
    const yapistirmaDakikaToplam = n(form.yapistirmaMtul) * n(form.yapistirmaDakika);

    const toplamDakika =
      tezgahDakikaToplam +
      tezgahArasiDakikaToplam +
      adaDakikaToplam +
      stresAlmaDakikaToplam +
      fasonEbatlamaDakikaToplam +
      kesim45DakikaToplam +
      pahlamaDakikaToplam +
      yapistirmaDakikaToplam;

    const plakaSayisi =
      n(form.manuelPlakaSayisi) > 0
        ? n(form.manuelPlakaSayisi)
        : n(form.plakadanAlinanMtul) > 0
        ? Math.ceil(toplamMtul / n(form.plakadanAlinanMtul))
        : 0;

    const malzeme = plakaSayisi * n(form.plakaFiyatiEuro) * n(form.kullanilanKur);

    const tezgahMaliyet = tezgahDakikaToplam * (makineMaliyet(form.tezgahMakineId) || 106.16);
    const tezgahArasiMaliyet = tezgahArasiDakikaToplam * (makineMaliyet(form.tezgahArasiMakineId) || 106.16);
    const adaMaliyet = adaDakikaToplam * (makineMaliyet(form.adaMakineId) || 106.16);
    const stresAlmaMaliyet = stresAlmaDakikaToplam * (makineMaliyet(form.stresAlmaMakineId) || 106.16);
    const fasonEbatlamaMaliyet = fasonEbatlamaDakikaToplam * (makineMaliyet(form.fasonEbatlamaMakineId) || 106.16);
    const kesim45Maliyet = kesim45DakikaToplam * (makineMaliyet(form.kesim45MakineId) || 106.16);
    const pahlamaMaliyet = pahlamaDakikaToplam * (makineMaliyet(form.pahlamaMakineId) || 106.16);
    const yapistirmaMaliyet = yapistirmaDakikaToplam * (makineMaliyet(form.yapistirmaMakineId) || 106.16);

    const iscilik =
      tezgahMaliyet +
      tezgahArasiMaliyet +
      adaMaliyet +
      stresAlmaMaliyet +
      fasonEbatlamaMaliyet +
      kesim45Maliyet +
      pahlamaMaliyet +
      yapistirmaMaliyet;
    const maliyet = malzeme + iscilik;
    const satis = maliyet * (1 + n(form.karYuzdesi) / 100);
    const kar = satis - maliyet;

    return {
      toplamMtul,
      tezgahMaliyet,
      tezgahArasiMaliyet,
      adaMaliyet,
      stresAlmaMaliyet,
      fasonEbatlamaMaliyet,
      kesim45DakikaToplam,
      pahlamaDakikaToplam,
      toplamDakika,
      plakaSayisi,
      malzeme,
      iscilik,
      maliyet,
      satis,
      kar,
      kesim45Maliyet,
      pahlamaMaliyet,
      yapistirmaMaliyet,
    };
  }, [form, makineler]);

  function onlineTeklifLinki() {
    if (!sonKayitTeklifNo) return ""
    return `${window.location.origin}/teklif/${sonKayitTeklifNo}`
  }

  function whatsappTeklifGonder() {
    const link = onlineTeklifLinki()
    if (!link) return
    const mesaj = encodeURIComponent(`Merhaba, teklifinizi aşağıdaki linkten inceleyip onaylayabilirsiniz:\n\n${link}`)
    window.open(`https://wa.me/?text=${mesaj}`, "_blank")
  }

  async function teklifLinkiKopyala() {
    const link = onlineTeklifLinki()
    if (!link) return
    await navigator.clipboard.writeText(link)
    alert("Teklif linki kopyalandı.")
  }

  function pdfTeklifAc() {
    if (!sonKayitIsId) return
    window.open(`/api/isler/${sonKayitIsId}/pdf`, "_blank")
  }

  async function kaydet() {
    if (!form.musteriAdi.trim()) return alert("Müşteri adı gerekli.");
    if (!form.urunAdi.trim()) return alert("Ürün / taş adı gerekli.");

    const operasyonlar = [
      {
        tip: "tezgah",
        mtul: n(form.metrajMtul),
        dakika: n(form.birMtulDakika),
        makineId: form.tezgahMakineId,
      },
      {
        tip: "tezgah_arasi",
        mtul: n(form.tezgahArasiMtul),
        dakika: n(form.tezgahArasiDakika),
        makineId: form.tezgahArasiMakineId,
      },
      {
        tip: "ada",
        mtul: n(form.adaTezgahMtul),
        dakika: n(form.adaTezgahDakika),
        makineId: form.adaMakineId,
      },
      {
        tip: "stres_alma",
        mtul: n(form.ozelIscilik1Mtul),
        dakika: n(form.ozelIscilik1Dakika),
        makineId: form.stresAlmaMakineId,
      },
      {
        tip: "fason_ebatlama",
        mtul: n(form.ozelIscilik2Mtul),
        dakika: n(form.ozelIscilik2Dakika),
        makineId: form.fasonEbatlamaMakineId,
      },
      {
        tip: "45_kesim",
        mtul: n(form.kesim45Mtul),
        dakika: n(form.kesim45Dakika),
        makineId: form.kesim45MakineId,
      },
      {
        tip: "pahlama",
        mtul: n(form.pahlamaMtul),
        dakika: n(form.pahlamaDakika),
        makineId: form.pahlamaMakineId,
      },
      {
        tip: "yapistirma_toplama",
        mtul: n(form.yapistirmaMtul),
        dakika: n(form.yapistirmaDakika),
        makineId: form.yapistirmaMakineId,
      },
    ]
      .filter((x) => x.mtul > 0 && x.dakika > 0)
      .map((x) => ({
        operasyonTipi: x.tip,
        makineId: x.makineId || null,
        adet: 1,
        birimDakika: x.dakika,
        toplamDakika: x.mtul * x.dakika,
      }));

    setKaydediliyor(true);

    try {
      const res = await fetch("/api/isler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          musteriId: form.musteriId || null,
          operasyonlar,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.hata || json.error || "İş kaydedilemedi.");
        return;
      }

      const teklifNo = veri?.teklifNo || veri?.is?.teklifNo || ""
      const isId = veri?.id || veri?.is?.id || ""
      setSonKayitTeklifNo(teklifNo)
      setSonKayitIsId(isId)
      setSonKayitModalAcik(true)
    } catch (e: any) {
      alert(e.message || "İş kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  const menu = [
    ["musteri", "Müşteri"],
    ["malzeme", "Taş & Plaka"],
    ["maliyet", "Maliyet"],
    ["not", "Notlar"],
  ] as const;

  const filtreliMusteriler = musteriler.filter((m) =>
    String(m.ad || "").toLocaleLowerCase("tr-TR").includes(form.musteriAdi.toLocaleLowerCase("tr-TR"))
  );

  return (
    <div className="h-screen bg-[#030712] text-white overflow-hidden flex">
      <style jsx global>{`
        .plaka-v2-fix input,
        .plaka-v2-fix select,
        .plaka-v2-fix textarea {
          color: #0f172a !important;
          background: #ffffff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #0f172a !important;
        }
        .plaka-v2-fix option {
          color: #0f172a !important;
          background: #ffffff !important;
        }
      `}</style>

      <aside className="w-[24%] border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Metrix</p>
          <h1 className="text-2xl mt-2">Yeni İş</h1>
        </div>

        <div className="p-4 space-y-3">
          {menu.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAktifBolum(key)}
              className={`w-full text-left rounded-xl px-4 py-3 border ${
                aktifBolum === key
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#0B1120] border-slate-800 text-slate-300 hover:bg-[#111827]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-auto p-4 border-t border-slate-800">
          <button onClick={() => router.push("/dashboard/isler")} className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 p-3">
            İşlere Dön
          </button>
        </div>
      </aside>

      <main className="w-[51%] p-6 overflow-hidden">
        <div className="h-full bg-[#0B1120] border border-slate-800 rounded-2xl p-6 overflow-hidden">
          {aktifBolum === "musteri" && (
            <div className="space-y-5">
              <h2 className="text-xl">Müşteri ve İş Bilgisi</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <p className="text-xs text-slate-400 mb-2">Müşteri Adı</p>
                  <input
                    value={form.musteriAdi}
                    onFocus={() => setMusteriListeAcik(true)}
                    onChange={(e) => {
                      setAlan("musteriAdi", e.target.value);
                      setAlan("musteriId", "");
                      setMusteriListeAcik(true);
                    }}
                    className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Müşteri seç veya yeni yaz..."
                  />

                  {musteriListeAcik && (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-[#111827] shadow-xl">
                      {filtreliMusteriler.slice(0, 10).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => musteriSec(m)}
                          className="block w-full border-b border-slate-800 px-4 py-3 text-left hover:bg-[#1f2937]"
                        >
                          <p className="text-sm">{m.ad}</p>
                          <p className="text-xs text-slate-500">{m.telefon || m.email || "Kayıtlı müşteri"}</p>
                        </button>
                      ))}

                      {form.musteriAdi.trim() && (
                        <button
                          type="button"
                          onClick={() => setMusteriListeAcik(false)}
                          className="block w-full px-4 py-3 text-left text-emerald-400 hover:bg-[#1f2937]"
                        >
                          “{form.musteriAdi}” yeni müşteri olarak kullan
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <label className="block">
                  <p className="text-xs text-slate-400 mb-2">İş Tarihi</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.isTarihi}
                      onChange={(e) => setAlan("isTarihi", e.target.value)}
                      className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 pr-12 outline-none focus:border-blue-500"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">📅</span>
                  </div>
                </label>

                <Input label="Ürün / Taş Adı" value={form.urunAdi} onChange={(v) => setAlan("urunAdi", v)} />
                <Select label="Malzeme Tipi" value={form.malzemeTipi} onChange={(v) => setAlan("malzemeTipi", v)} options={["Porselen", "Kuvars", "Doğaltaş"]} />
                <Select label="Müşteri Tipi" value={form.musteriTipi} onChange={(v) => setAlan("musteriTipi", v)} options={["Ev sahibi", "Mimar", "Müteahhit", "İmalatçı"]} />
              </div>
            </div>
          )}

          {aktifBolum === "malzeme" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-xl">Taş ve Plaka</h2>
                <button onClick={() => setPlakaAcik(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3">
                  Plaka Planlayıcı Aç
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input label="Plaka Fiyatı €" value={form.plakaFiyatiEuro} onChange={(v) => setAlan("plakaFiyatiEuro", v)} />
                <Input label="Kur" value={form.kullanilanKur} onChange={(v) => setAlan("kullanilanKur", v)} />
                <Input label="Plaka Sayısı" value={form.manuelPlakaSayisi} onChange={(v) => setAlan("manuelPlakaSayisi", v)} />
                <Input label="Plaka Genişlik cm" value={form.plakaGenislikCm} onChange={(v) => setAlan("plakaGenislikCm", v)} />
                <Input label="Plaka Yükseklik cm" value={form.plakaUzunlukCm} onChange={(v) => setAlan("plakaUzunlukCm", v)} />
                <Input label="Plakadan Alınan Mtül" value={form.plakadanAlinanMtul} onChange={(v) => setAlan("plakadanAlinanMtul", v)} />
              </div>
            </div>
          )}

          {aktifBolum === "maliyet" && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl">Maliyet ve Üretim Süresi</h2>
                <div className="text-xs text-slate-400">
                  Satır bazlı üretim maliyeti
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.2fr_0.75fr] gap-2 mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <div>İşlem / Mtül</div>
                <div>Makine</div>
                <div>Süre</div>
              </div>

              <div className="space-y-1.5">
                <OperationRow
                  label="Tezgah"
                  mtul={form.metrajMtul}
                  setMtul={(v: string) => setAlan("metrajMtul", v)}
                  makine={form.tezgahMakineId}
                  setMakine={(v: string) => setAlan("tezgahMakineId", v)}
                  dakika={form.birMtulDakika}
                  setDakika={(v: string) => setAlan("birMtulDakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Tezgah Arası"
                  mtul={form.tezgahArasiMtul}
                  setMtul={(v: string) => setAlan("tezgahArasiMtul", v)}
                  makine={form.tezgahArasiMakineId}
                  setMakine={(v: string) => setAlan("tezgahArasiMakineId", v)}
                  dakika={form.tezgahArasiDakika}
                  setDakika={(v: string) => setAlan("tezgahArasiDakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Ada"
                  mtul={form.adaTezgahMtul}
                  setMtul={(v: string) => setAlan("adaTezgahMtul", v)}
                  makine={form.adaMakineId}
                  setMakine={(v: string) => setAlan("adaMakineId", v)}
                  dakika={form.adaTezgahDakika}
                  setDakika={(v: string) => setAlan("adaTezgahDakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Stres Alma"
                  mtul={form.ozelIscilik1Mtul}
                  setMtul={(v: string) => setAlan("ozelIscilik1Mtul", v)}
                  makine={form.stresAlmaMakineId}
                  setMakine={(v: string) => setAlan("stresAlmaMakineId", v)}
                  dakika={form.ozelIscilik1Dakika}
                  setDakika={(v: string) => setAlan("ozelIscilik1Dakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Fason Ebatlama"
                  mtul={form.ozelIscilik2Mtul}
                  setMtul={(v: string) => setAlan("ozelIscilik2Mtul", v)}
                  makine={form.fasonEbatlamaMakineId}
                  setMakine={(v: string) => setAlan("fasonEbatlamaMakineId", v)}
                  dakika={form.ozelIscilik2Dakika}
                  setDakika={(v: string) => setAlan("ozelIscilik2Dakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="45 Kesim"
                  mtul={form.kesim45Mtul}
                  setMtul={(v: string) => setAlan("kesim45Mtul", v)}
                  makine={form.kesim45MakineId}
                  setMakine={(v: string) => setAlan("kesim45MakineId", v)}
                  dakika={form.kesim45Dakika}
                  setDakika={(v: string) => setAlan("kesim45Dakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Pahlama"
                  mtul={form.pahlamaMtul}
                  setMtul={(v: string) => setAlan("pahlamaMtul", v)}
                  makine={form.pahlamaMakineId}
                  setMakine={(v: string) => setAlan("pahlamaMakineId", v)}
                  dakika={form.pahlamaDakika}
                  setDakika={(v: string) => setAlan("pahlamaDakika", v)}
                  makineler={makineler}
                />

                <OperationRow
                  label="Yapıştırma / Toplama"
                  mtul={form.yapistirmaMtul}
                  setMtul={(v: string) => setAlan("yapistirmaMtul", v)}
                  makine={form.yapistirmaMakineId}
                  setMakine={(v: string) => setAlan("yapistirmaMakineId", v)}
                  dakika={form.yapistirmaDakika}
                  setDakika={(v: string) => setAlan("yapistirmaDakika", v)}
                  makineler={makineler}
                />
              </div>

              <div className="mt-3 grid grid-cols-[1fr_0.75fr] gap-3">
                <div></div>
                <Input label="Kar %" value={form.karYuzdesi} onChange={(v) => setAlan("karYuzdesi", v)} />
              </div>
            </div>
          )}

          {aktifBolum === "not" && (
            <div className="space-y-5">
              <h2 className="text-xl">Notlar</h2>
              <textarea
                value={form.notlar}
                onChange={(e) => setAlan("notlar", e.target.value)}
                className="w-full h-[260px] rounded-xl bg-[#111827] border border-slate-700 p-4 outline-none"
                placeholder="İş notları..."
              />
            </div>
          )}
        </div>
      </main>

      <aside className="w-[25%] border-l border-slate-800 p-6 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-hidden space-y-3">
          <h2 className="text-sm text-slate-400">Canlı Özet</h2>

        <Card label="Teklif Tutarı" value={para(hesap.satis)} color="text-emerald-400" />
        <Card label="Toplam Maliyet" value={para(hesap.maliyet)} />
        <Card label="Kâr" value={para(hesap.kar)} color="text-yellow-400" />
        <Card label="Plaka" value={`${hesap.plakaSayisi} adet`} />
        <Card label="Süre" value={`${hesap.toplamDakika.toFixed(0)} dk`} />
        <Card label="45 Kesim Maliyeti" value={para(hesap.kesim45Maliyet)} />
        <Card label="Pahlama Maliyeti" value={para(hesap.pahlamaMaliyet)} />
        <Card label="Yapıştırma Maliyeti" value={para(hesap.yapistirmaMaliyet)} />

        </div>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <button
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-700 p-4 text-lg font-semibold"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Hesapla & Kaydet"}
          </button>
        </div>
      </aside>
      {plakaAcik && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPlakaAcik(false)}>
          <div className="plaka-v2-fix w-[95vw] h-[95vh] bg-[#030712] rounded-2xl p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl">Plaka Planlayıcı</h2>
                <p className="text-sm text-slate-400">Ürün, ölçü ve fiyat bilgileri otomatik aktarıldı.</p>
              </div>
              <button onClick={() => setPlakaAcik(false)} className="border border-slate-700 px-4 py-2 rounded-xl">
                Kapat
              </button>
            </div>

            <PlakaPlanlayiciV2
              embedded
              initialProductName={form.urunAdi}
              initialPlakaGenislik={form.plakaGenislikCm}
              initialPlakaYukseklik={form.plakaUzunlukCm}
              initialPlakaFiyati={form.plakaFiyatiEuro}
              onApply={aiAktar}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OperationRow({
  label,
  mtul,
  setMtul,
  makine,
  setMakine,
  dakika,
  setDakika,
  makineler,
}: any) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr_0.75fr] gap-2 items-end rounded-xl border border-slate-800 bg-[#111827]/60 px-2.5 py-1.5">
      <label className="block">
        <p className="text-[10px] text-slate-400 mb-1">{label} Mtül</p>
        <input
          value={mtul}
          onChange={(e) => setMtul(e.target.value)}
          className="w-full h-9 rounded-lg bg-[#0B1120] border border-slate-700 px-3 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <label className="block min-w-0">
        <p className="text-[10px] text-slate-400 mb-1">Makine</p>
        <select
          value={makine}
          onChange={(e) => setMakine(e.target.value)}
          className="w-full h-9 rounded-lg bg-[#0B1120] border border-slate-700 px-2 text-[11px] leading-none outline-none focus:border-blue-500 truncate"
        >
          {makineler.length === 0 && <option value="">Makine yok</option>}
          {makineler.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.makineAdi} · {Number(m.dakikalikMaliyet || 0).toFixed(2)}₺/dk
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <p className="text-[10px] text-slate-400 mb-1">Süre dk/mtül</p>
        <input
          value={dakika}
          onChange={(e) => setDakika(e.target.value)}
          className="w-full h-9 rounded-lg bg-[#0B1120] border border-slate-700 px-3 text-sm outline-none focus:border-blue-500"
        />
      </label>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="block">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
      >
        {options.map((o: string) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function SelectMakine({ label, value, onChange, makineler }: any) {
  return (
    <label className="block">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#111827] border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
      >
        {makineler.length === 0 && <option value="">Makine yok</option>}
        {makineler.map((m: any) => (
          <option key={m.id} value={m.id}>
            {m.makineAdi} · {Number(m.dakikalikMaliyet || 0).toFixed(2)}₺/dk
          </option>
        ))}
      </select>
    </label>
  );
}

function Card({ label, value, color = "text-white" }: any) {
  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl mt-2 ${color}`}>{value}</p>
    </div>
  );
}



function PopupCard({ label, value }: any) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    
      {sonKayitModalAcik && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-[32px] border border-slate-700 bg-[#0B1120] p-6 text-white shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">TEKLİF HAZIR</p>
              <h2 className="mt-2 text-2xl font-black">Satış aksiyonu seç</h2>
              <p className="mt-2 text-sm text-slate-400">
                Teklif kaydedildi. Müşteriye online onay linki gönderebilir, PDF açabilir veya fiyat kırılımını kontrol edebilirsin.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={whatsappTeklifGonder}
                className="w-full rounded-2xl bg-green-600 px-5 py-4 text-sm font-black text-white hover:bg-green-500"
              >
                📲 WhatsApp ile Müşteriye Gönder
              </button>

              <button
                type="button"
                onClick={teklifLinkiKopyala}
                className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white hover:bg-slate-800"
              >
                🔗 Online Teklif Linkini Kopyala
              </button>

              <button
                type="button"
                onClick={pdfTeklifAc}
                className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-500"
              >
                📄 PDF Teklifi Aç
              </button>

              <button
                type="button"
                onClick={() => setSonKayitModalAcik(false)}
                className="w-full rounded-2xl border border-slate-700 px-5 py-4 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}

function PopupInput({ label, value, onChange }: any) {
  return (
    <label className="block">
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      <input
        value={Number(value || 0).toFixed(2)}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
      />
    </label>
  );
}

