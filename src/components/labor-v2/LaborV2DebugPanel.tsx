"use client";

import { useState } from "react";
import type { LaborV2Result } from "@/lib/labor-v2";

function tl(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

export function LaborV2DebugPanel({
  result,
}: {
  result: LaborV2Result;
}) {
  const [open, setOpen] = useState(false);
  const adjustments = result.adjustments.filter((adjustment) => adjustment.applied);

  return (
    <div className="hidden md:block rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 shadow-[0_18px_60px_rgba(16,185,129,0.08)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-100">İşçilik Maliyeti</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "Toplam işçilik", value: tl(result.totalLaborCost), color: "#6ee7b7" },
              { label: "Toplam dakika", value: `${result.totalMinutes.toFixed(2)} dk`, color: "#e5e7eb" },
              { label: "Efektif dk maliyeti", value: `${tl(result.effectiveMinuteCost)}/dk`, color: "#e5e7eb" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-black tabular-nums" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <span className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300" aria-label={open ? "Detayı kapat" : "Detayı aç"}>
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      {open && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          {result.warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
              <p className="text-xs font-black text-amber-200">Uyarılar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.warnings.map((warning) => (
                  <span key={warning.key} className="rounded-full bg-slate-950 px-2 py-1 text-[11px] text-amber-100">
                    {warning.key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {adjustments.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs font-black text-slate-200">İşçilik Detayları</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {adjustments.map((adjustment) => (
                  <div key={adjustment.key} className="rounded-lg bg-slate-950 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-300">{adjustment.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {adjustment.minutes ? `${adjustment.minutes.toFixed(2)} dk · ` : ""}
                      {tl(adjustment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs font-black text-slate-200">Hesap Açıklaması</p>
              <div className="mt-2 space-y-1">
                {result.explain.length === 0 ? (
                  <p className="text-xs text-slate-500">Açıklama satırı yok.</p>
                ) : result.explain.map((line, index) => (
                  <p key={`${line}-${index}`} className="text-xs text-slate-400">{line}</p>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs font-black text-slate-200">Operasyon Dökümü</p>
              <div className="mt-2 max-h-64 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-2 text-left font-bold">Kalem</th>
                      <th className="py-2 text-right font-bold">Dk</th>
                      <th className="py-2 text-right font-bold">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdownRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-900">
                        <td className="py-2 pr-2 text-slate-300">
                          <span className="font-semibold">{row.label}</span>
                          <span className="ml-2 text-[10px] text-slate-600">{row.category}</span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-slate-400">{row.minutes.toFixed(2)}</td>
                        <td className="py-2 text-right font-bold tabular-nums text-cyan-100">{tl(row.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
