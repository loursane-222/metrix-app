"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { paraGoster } from "@/lib/format";

type Is = {
  id: string;
  musteriAdi: string;
  urunAdi: string;
  satisFiyati: number;
  durum: string;
};

function durumRenk(durum: string) {
  switch (durum) {
    case "onaylandi":
      return "bg-emerald-50 text-emerald-700";
    case "kaybedildi":
      return "bg-rose-50 text-rose-700";
    case "teklif_verildi":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-50 text-slate-700";
  }
}

function durumText(durum: string) {
  switch (durum) {
    case "onaylandi":
      return "Onaylandı";
    case "kaybedildi":
      return "Kaybedildi";
    case "teklif_verildi":
      return "Bekliyor";
    default:
      return durum;
  }
}

export default function RecentJobs() {
  const [isler, setIsler] = useState<Is[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/isler")
      .then((res) => res.json())
      .then((res) => {
        setIsler(res.isler?.slice(0, 5) || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-slate-500 text-sm">Yükleniyor...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Son İşler</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Güncel teklifler ve işler
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isler.length === 0 && (
          <p className="text-sm text-slate-500">Henüz iş yok</p>
        )}

        {isler.map((is) => (
          <div
            key={is.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {is.musteriAdi || "Müşteri yok"}
              </p>
              <p className="text-sm text-slate-500">
                {is.urunAdi || "Ürün yok"}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold">
                {paraGoster(is.satisFiyati || 0)}
              </p>

              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${durumRenk(
                  is.durum
                )}`}
              >
                {durumText(is.durum)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
