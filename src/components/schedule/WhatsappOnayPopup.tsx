"use client";

import { useEffect, useState } from "react";

type OnayliIs = {
  id: string;
  teklifNo: string;
  musteriAdi: string;
  urunAdi: string;
  malzemeTipi: string;
  satisFiyati: string | number;
  kdvDahilFiyat: string | number;
  onaylanmaTarihi: string | null;
  tasDurumu: string | null;
};

function para(v: any) {
  return Number(v || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₺";
}

export function WhatsappOnayPopup() {
  const [items, setItems] = useState<OnayliIs[]>([]);
  const [selected, setSelected] = useState<OnayliIs | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/isler/whatsapp-onayli", { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data?.isler) ? data.isler : []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTasDurumu(tasDurumu: "stokta" | "alinacak") {
    if (!selected) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/isler/${selected.id}/tas-durumu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasDurumu }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.hata || "Taş durumu kaydedilemedi.");
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== selected.id));
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  if (!items.length) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center">
      <div className="max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/15 to-blue-500/10 p-5">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            WhatsApp'tan onaylananlar
          </div>
          <h2 className="mt-2 text-xl font-black text-white">
            Yeni onaylanan teklif var
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            İş programına almadan önce taş durumunu seç.
          </p>
        </div>

        <div className="grid max-h-[68dvh] gap-0 overflow-y-auto md:grid-cols-[1fr_320px]">
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={"w-full p-4 text-left transition " + (selected?.id === item.id ? "bg-white/10" : "hover:bg-white/5")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white">{item.musteriAdi || "-"}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.teklifNo} • {item.urunAdi} • {item.malzemeTipi}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                    Onaylandı
                  </div>
                </div>
                <div className="mt-3 text-sm font-bold text-slate-200">
                  {para(item.kdvDahilFiyat || item.satisFiyati)}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 bg-white/[0.03] p-4 md:border-l md:border-t-0">
            {selected ? (
              <>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Taş durumu
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-black text-white">{selected.musteriAdi}</div>
                  <div className="mt-1 text-xs text-slate-400">{selected.urunAdi}</div>
                </div>

                <div className="mt-4 grid gap-3">
                  <button
                    disabled={saving}
                    onClick={() => saveTasDurumu("stokta")}
                    className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-4 text-left text-sm font-black text-emerald-100 disabled:opacity-50"
                  >
                    ☑ Taş stokta
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => saveTasDurumu("alinacak")}
                    className="rounded-2xl border border-orange-400/30 bg-orange-500/15 p-4 text-left text-sm font-black text-orange-100 disabled:opacity-50"
                  >
                    ☑ Taş alınacak
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
                Soldaki listeden bir onay seç.
              </div>
            )}

            <button
              onClick={() => setItems([])}
              className="mt-5 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"
            >
              Şimdilik kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
