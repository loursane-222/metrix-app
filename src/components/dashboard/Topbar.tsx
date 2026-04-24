"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="mb-6 rounded-[32px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex justify-between items-center">

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">METRIX</p>
          <h1 className="text-2xl font-bold">
            {pathname === "/dashboard/is-programi" ? "İş Programı" : "Panel"}
          </h1>
        </div>

        {/* 🔥 ARTIK ÇALIŞAN BUTON */}
        {pathname === "/dashboard/is-programi" && (
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("openScheduleModal"));
            }}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-white font-semibold"
          >
            + Program Ekle
          </button>
        )}

      </div>
    </header>
  );
}
