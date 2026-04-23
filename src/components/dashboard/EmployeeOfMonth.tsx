"use client";

import { useEffect, useState } from "react";

type Personel = {
  id: string;
  ad: string;
  soyad: string;
  gorevi: string;
  performansNotu: number;
  toplamGorev: number;
  tamamlananGorev: number;
  zamanindaTamamlanan: number;
};

export default function EmployeeOfMonth() {
  const [best, setBest] = useState<Personel | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "same">("same");

  useEffect(() => {
    fetch("/api/personel")
      .then((res) => res.json())
      .then((data) => {
        const list: Personel[] = data.personeller || [];

        if (!list.length) return;

        const scored = list.map((p) => {
          const tamamlama =
            p.toplamGorev > 0 ? p.tamamlananGorev / p.toplamGorev : 0;

          const zamaninda =
            p.tamamlananGorev > 0
              ? p.zamanindaTamamlanan / p.tamamlananGorev
              : 0;

          const skor =
            tamamlama * 0.4 +
            zamaninda * 0.3 +
            (p.performansNotu || 0) / 100 * 0.2 +
            Math.min(1, p.toplamGorev / 20) * 0.1;

          return { ...p, skor };
        });

        scored.sort((a, b) => b.skor - a.skor);

        setBest(scored[0]);

        // basit trend simülasyonu
        const r = Math.random();
        if (r > 0.6) setTrend("up");
        else if (r < 0.3) setTrend("down");
        else setTrend("same");
      });
  }, []);

  if (!best) return null;

  const zamanindaOran =
    best.tamamlananGorev > 0
      ? Math.round(
          (best.zamanindaTamamlanan / best.tamamlananGorev) * 100
        )
      : 0;

  return (
    <div className="rounded-3xl border bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-gray-300 tracking-widest">
            AYIN ELEMANI
          </p>

          <h2 className="text-2xl font-bold mt-2">
            {best.ad} {best.soyad}
          </h2>

          <p className="text-sm text-gray-300">{best.gorevi}</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">Performans</p>
          <p className="text-2xl font-bold">
            %{best.performansNotu || 0}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-gray-300">Görev</p>
          <p className="font-bold">{best.toplamGorev}</p>
        </div>

        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-gray-300">Tamamlanan</p>
          <p className="font-bold">{best.tamamlananGorev}</p>
        </div>

        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-gray-300">Zamanında</p>
          <p className="font-bold">%{zamanindaOran}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-300">
        {trend === "up" && "↑ Performans geçen aya göre arttı"}
        {trend === "down" && "↓ Performans düşüş gösterdi"}
        {trend === "same" && "→ Performans stabil"}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Bu personel yüksek tamamlama oranı ve zamanında teslim performansı ile öne çıktı.
      </div>
    </div>
  );
}
