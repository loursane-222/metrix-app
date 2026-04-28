const fs = require("fs");
const path = require("path");

function backup(file) {
  if (!fs.existsSync(file)) throw new Error("Dosya bulunamadı: " + file);
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  fs.copyFileSync(file, `${file}.bak-whatsapp-onay-${stamp}`);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function patchSchema() {
  const file = "prisma/schema.prisma";
  backup(file);
  let s = fs.readFileSync(file, "utf8");

  if (!s.includes("whatsappOnay")) {
    s = s.replace(
      /(\s+tasDurumu String\?\n)/,
      `$1\n  whatsappOnay       Boolean  @default(false)\n  whatsappOnayOkundu Boolean  @default(false)\n`
    );
  }

  fs.writeFileSync(file, s);
}

function patchOnayRoute() {
  const file = "src/app/api/teklif/[teklifNo]/onayla/route.ts";
  backup(file);
  let s = fs.readFileSync(file, "utf8");

  s = s.replace(
    /data:\s*{\s*durum:\s*"onaylandi",\s*onaylanmaTarihi:\s*new Date\(\),\s*}/s,
    `data: {
        durum: "onaylandi",
        onaylanmaTarihi: new Date(),
        whatsappOnay: true,
        whatsappOnayOkundu: false,
      }`
  );

  fs.writeFileSync(file, s);
}

function createApis() {
  write("src/app/api/isler/whatsapp-onayli/route.ts", `import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const isler = await prisma.is.findMany({
      where: {
        durum: "onaylandi",
        whatsappOnay: true,
        whatsappOnayOkundu: false,
        workSchedule: null,
      },
      orderBy: { onaylanmaTarihi: "desc" },
      take: 30,
      select: {
        id: true,
        teklifNo: true,
        musteriAdi: true,
        urunAdi: true,
        malzemeTipi: true,
        satisFiyati: true,
        kdvDahilFiyat: true,
        onaylanmaTarihi: true,
        tasDurumu: true,
      },
    });

    return NextResponse.json({ isler });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
`);

  write("src/app/api/isler/[id]/tas-durumu/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const tasDurumu = String(body?.tasDurumu || "");

    if (!["stokta", "alinacak"].includes(tasDurumu)) {
      return NextResponse.json({ hata: "Geçersiz taş durumu." }, { status: 400 });
    }

    const is = await prisma.is.update({
      where: { id },
      data: {
        tasDurumu,
        whatsappOnayOkundu: true,
      },
      select: {
        id: true,
        teklifNo: true,
        musteriAdi: true,
        urunAdi: true,
        tasDurumu: true,
      },
    });

    return NextResponse.json({ ok: true, is });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
`);
}

function createPopupComponent() {
  write("src/components/schedule/WhatsappOnayPopup.tsx", `"use client";

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
      const res = await fetch(\`/api/isler/\${selected.id}/tas-durumu\`, {
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
`);
}

function patchIsProgramiPage() {
  const file = "src/app/dashboard/is-programi/page.tsx";
  backup(file);
  let s = fs.readFileSync(file, "utf8");

  if (!s.includes("WhatsappOnayPopup")) {
    s = s.replace(
      `import { PremiumWorkCalendar } from "@/components/schedule/PremiumWorkCalendar";`,
      `import { PremiumWorkCalendar } from "@/components/schedule/PremiumWorkCalendar";\nimport { WhatsappOnayPopup } from "@/components/schedule/WhatsappOnayPopup";`
    );

    s = s.replace(
      `<PremiumWorkCalendar`,
      `<WhatsappOnayPopup />\n      <PremiumWorkCalendar`
    );
  }

  fs.writeFileSync(file, s);
}

function patchAtolyeScrollCss() {
  const file = "src/app/globals.css";
  backup(file);
  let s = fs.readFileSync(file, "utf8");

  if (!s.includes("METRIX_ATOLYE_SCROLL_FIX")) {
    s += `

/* METRIX_ATOLYE_SCROLL_FIX */
@media (max-width: 768px) {
  .metrix-atolye-scroll-panel,
  [data-metrix-atolye-scroll-panel="true"] {
    max-height: 62dvh !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .metrix-atolye-scroll-panel::-webkit-scrollbar,
  [data-metrix-atolye-scroll-panel="true"]::-webkit-scrollbar {
    width: 6px;
  }

  .metrix-atolye-scroll-panel::-webkit-scrollbar-thumb,
  [data-metrix-atolye-scroll-panel="true"]::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.45);
    border-radius: 999px;
  }
}
`;
  }

  fs.writeFileSync(file, s);
}

function patchAtolyePageBestEffort() {
  const file = "src/app/dashboard/atolye/page.tsx";
  backup(file);
  let s = fs.readFileSync(file, "utf8");

  // Girdiler / Kapasite içerik panellerinde zaten overflow varsa dokunma.
  // Güvenli best-effort: ilgili başlıkların yakınındaki ilk büyük panel class'larına scroll class'ı eklemeye çalışır.
  if (!s.includes("metrix-atolye-scroll-panel")) {
    s = s.replace(
      /(Girdiler[\s\S]{0,900}?className=")([^"]*)/i,
      (m, p1, p2) => p1 + (p2.includes("metrix-atolye-scroll-panel") ? p2 : p2 + " metrix-atolye-scroll-panel")
    );

    s = s.replace(
      /(Kapasite[\s\S]{0,900}?className=")([^"]*)/i,
      (m, p1, p2) => p1 + (p2.includes("metrix-atolye-scroll-panel") ? p2 : p2 + " metrix-atolye-scroll-panel")
    );
  }

  fs.writeFileSync(file, s);
}

patchSchema();
patchOnayRoute();
createApis();
createPopupComponent();
patchIsProgramiPage();
patchAtolyeScrollCss();
patchAtolyePageBestEffort();

console.log("✅ Patch tamamlandı.");
