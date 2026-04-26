"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function IsDetayContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [fiyat, setFiyat] = useState<number>(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tasPopup, setTasPopup] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("ID bulunamadı.");
      return;
    }

    fetch(`/api/is-detay?id=${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Veri alınamadı");
        return d;
      })
      .then((d) => {
        setData(d);
        setFiyat(Number(d.satisFiyati || 0));
      })
      .catch((err) => setError(err.message || "Veri alınamadı"));
  }, [id]);

  async function durumGuncelle(yeniDurum: string, tasDurumu?: "stokta" | "alinacak") {
    if (!id) return;

    setSaving(true);

    try {
      const res = await fetch("/api/is-durum-guncelle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          durum: yeniDurum,
          fiyat,
          tasDurumu
        })
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Durum güncellenemedi.");
        return;
      }

      setData(json.data);
      setTasPopup(false);
    } catch (e: any) {
      alert(e.message || "Durum güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] text-red-400 p-10">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#030712] text-white p-10">
        Yükleniyor...
      </div>
    );
  }

  const maliyet = Number(data.toplamMaliyet || 0);
  const kar = fiyat - maliyet;
  const karYuzde = maliyet > 0 ? (kar / maliyet) * 100 : 0;

  let fiyatMesaji = "";
  let fiyatRenk = "";

  if (karYuzde < 15) {
    fiyatMesaji = "ZARAR SINIRINDA. BU FİYATA VERME.";
    fiyatRenk = "text-red-400";
  } else if (karYuzde < 30) {
    fiyatMesaji = "Dikkatli ol. Pazarlık payı çok az.";
    fiyatRenk = "text-amber-400";
  } else if (karYuzde < 60) {
    fiyatMesaji = "Bu fiyat verilebilir ama pazarlık yapma.";
    fiyatRenk = "text-yellow-400";
  } else {
    fiyatMesaji = "GÜÇLÜ FİYAT. Müşteri sıcaksa kapat.";
    fiyatRenk = "text-emerald-400";
  }

  const tasDurumuLabel =
    data.tasDurumu === "alinacak"
      ? "Taş Alınacak"
      : data.tasDurumu === "stokta"
      ? "Taş Stokta"
      : data.tasDurumu === "alindi"
      ? "Taş Alındı"
      : "Belirsiz";

  return (
    <div className="min-h-screen bg-[#030712] text-white p-6 flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl">{data.musteriAdi}</h1>
          <p className="text-slate-400">{data.teklifNo}</p>
        </div>

        <button
          onClick={() => window.history.back()}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Kapat
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">Maliyet</p>
          <p className="text-xl">{maliyet.toLocaleString("tr-TR")} ₺</p>
        </div>

        <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">Satış</p>
          <p className="text-xl text-emerald-400">{fiyat.toLocaleString("tr-TR")} ₺</p>
        </div>

        <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">Kâr</p>
          <p className="text-xl text-yellow-400">
            {kar.toLocaleString("tr-TR")} ₺ (%{karYuzde.toFixed(1)})
          </p>
        </div>

        <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">Taş Durumu</p>
          <p className={`text-xl ${
            data.tasDurumu === "alinacak"
              ? "text-amber-400"
              : data.tasDurumu === "stokta" || data.tasDurumu === "alindi"
              ? "text-emerald-400"
              : "text-slate-300"
          }`}>
            {tasDurumuLabel}
          </p>
        </div>
      </div>

      <div className="bg-[#0B1120] p-6 rounded-xl border border-slate-800">
        <input
          type="range"
          min={Math.round(maliyet * 1.05)}
          max={Math.round(maliyet * 2)}
          step="500"
          value={fiyat}
          onChange={(e) => setFiyat(Number(e.target.value))}
          className="w-full"
        />

        <div className="text-center text-2xl mt-4 text-emerald-400">
          {fiyat.toLocaleString("tr-TR")} ₺
        </div>

        <div className="flex gap-3 mt-4 justify-center">
          <button
            onClick={() => setFiyat(Math.max(Math.round(maliyet * 1.05), fiyat - 5000))}
            className="bg-amber-600 px-3 py-2 rounded"
          >
            -5K
          </button>

          <button
            onClick={() => setFiyat(fiyat + 5000)}
            className="bg-emerald-600 px-3 py-2 rounded"
          >
            +5K
          </button>

          <button
            onClick={() => setFiyat(Math.round(fiyat / 1000) * 1000 - 100)}
            className="bg-blue-600 px-3 py-2 rounded"
          >
            99 yap
          </button>
        </div>
      </div>

      <div className={`text-center text-lg font-semibold ${fiyatRenk}`}>
        {fiyatMesaji}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3">
        <button
          disabled={saving}
          onClick={() => durumGuncelle("teklif_verildi")}
          className={`rounded-xl py-4 text-lg ${
            data.durum === "teklif_verildi"
              ? "bg-amber-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Beklemede
        </button>

        <button
          disabled={saving}
          onClick={() => setTasPopup(true)}
          className={`rounded-xl py-4 text-lg ${
            data.durum === "onaylandi"
              ? "bg-emerald-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Onaylandı
        </button>

        <button
          disabled={saving}
          onClick={() => durumGuncelle("kaybedildi")}
          className={`rounded-xl py-4 text-lg ${
            data.durum === "kaybedildi"
              ? "bg-red-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Kaybedildi
        </button>
      </div>

      {tasPopup && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setTasPopup(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B1120] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">
                İş Onayı
              </p>
              <h2 className="mt-2 text-xl font-semibold">Taş durumu seç</h2>
              <p className="mt-2 text-sm text-slate-400">
                Bu seçim satış detayına yazılır. Taş alınacak seçilirse ölçü programında otomatik görev üretilecek.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                disabled={saving}
                onClick={() => durumGuncelle("onaylandi", "stokta")}
                className="rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-4 py-4 text-left hover:bg-emerald-600/30"
              >
                <p className="font-semibold text-emerald-300">Taş Stokta</p>
                <p className="text-xs text-slate-400 mt-1">Malzeme hazır, iş programa alınabilir.</p>
              </button>

              <button
                disabled={saving}
                onClick={() => durumGuncelle("onaylandi", "alinacak")}
                className="rounded-xl border border-amber-500/30 bg-amber-600/20 px-4 py-4 text-left hover:bg-amber-600/30"
              >
                <p className="font-semibold text-amber-300">Taş Alınacak</p>
                <p className="text-xs text-slate-400 mt-1">Ölçüden 3 iş günü önce taş alma görevi üretilecek.</p>
              </button>

              <button
                disabled={saving}
                onClick={() => setTasPopup(false)}
                className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:bg-slate-800"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function IsDetayPage() {
  return (
    <Suspense fallback={<div className="p-6">Yükleniyor...</div>}>
      <IsDetayContent />
    </Suspense>
  )
}
