"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import InAppToast, { showToast } from "@/components/push/InAppToast";

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n.toLocaleString("tr-TR");
}

function phoneClean(tel: string) {
  let clean = String(tel || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "90" + clean.slice(1);
  if (clean.length === 10) clean = "90" + clean;
  return clean;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "simdi";
  if (diff < 3600) return Math.floor(diff / 60) + "dk";
  if (diff < 86400) return Math.floor(diff / 3600) + "sa";
  return Math.floor(diff / 86400) + "g";
}

function activityColor(type: string) {
  if (type?.includes("onayla") || type?.includes("tahsilat")) return "#22c55e";
  if (type?.includes("teklif") || type?.includes("yeni")) return "#60a5fa";
  if (type?.includes("kayb") || type?.includes("iptal")) return "#f87171";
  if (type?.includes("montaj") || type?.includes("imalat") || type?.includes("olcu")) return "#a78bfa";
  return "#94a3b8";
}

function phaseColor(phase: string) {
  if (phase === "OLCU") return "#60a5fa";
  if (phase === "IMALAT") return "#f59e0b";
  if (phase === "MONTAJ") return "#22c55e";
  if (phase === "TAS_ALINACAK") return "#f87171";
  return "#94a3b8";
}

function telHref(phone: string) {
  return "tel:" + phone;
}

function waHref(phone: string, msg: string) {
  const encoded = encodeURIComponent(msg);
  if (phone) return "https://wa.me/" + phone + "?text=" + encoded;
  return "https://wa.me/?text=" + encoded;
}

type FinansBlok = {
  verilen: number;
  onaylanan: number;
  kaybedilen: number;
  devam: number;
  donusumOrani: number;
  teklifSayisi: number;
};

function AiWaButon({
  label,
  phone,
  payload,
  tip,
  className,
}: {
  label: string;
  phone: string;
  payload: Record<string, any>;
  tip: "satis" | "tahsilat";
  className?: string;
}) {
  const [durum, setDurum] = useState<"idle" | "loading" | "done">("idle");
  const [mesaj, setMesaj] = useState("");

  async function tikla() {
    if (durum === "loading") return;

    if (mesaj) {
      const a = document.createElement("a");
      a.href = waHref(phone, mesaj);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setDurum("loading");
    try {
      const res = await fetch("/api/ai-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tip }),
      });
      const json = await res.json();
      if (json.error) {
        alert("Hata: " + json.error + (json.detail ? " - " + json.detail : ""));
        setDurum("idle");
        return;
      }
      const m = json.mesaj || "";
      if (!m) {
        alert("Mesaj uretilemedi, lutfen tekrar deneyin.");
        setDurum("idle");
        return;
      }
      setMesaj(m);
      setDurum("done");
    } catch (err: any) {
      alert("Baglanti hatasi: " + (err?.message || String(err)));
      setDurum("idle");
    }
  }

  if (durum === "done" && mesaj) {
    const waUrl = waHref(phone, mesaj);
    return (
      <a href={waUrl} className={className} style={{ display: "inline-block", textAlign: "center" }}>
        WA Mesaj Gonder
      </a>
    );
  }

  return (
    <button
      onClick={tikla}
      disabled={durum === "loading"}
      className={className}
    >
      {durum === "loading" ? "Hazirlaniyor..." : label}
    </button>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [sekme, setSekme] = useState<"yillik" | "aylik">("aylik");

  const lastAkisIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchDashboard(first) {
      try {
        const r = await fetch("/api/dashboard");
        const json = await r.json();
        if (json?.error) { setError(json.error); return; }

        if (!first && json?.anaAkis?.length > 0) {
          const newest = json.anaAkis[0];
          if (lastAkisIdRef.current && newest.id !== lastAkisIdRef.current) {
            showToast("Metrix", newest.message);
          }
        }

        if (json?.anaAkis?.length > 0) {
          lastAkisIdRef.current = json.anaAkis[0].id;
        }

        setData(json);
      } catch {
        setError("Dashboard verisi alinamadi.");
      }
    }

    fetchDashboard(true);
    const interval = setInterval(() => fetchDashboard(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const finans: FinansBlok = useMemo(
    () =>
      data?.finans?.[sekme] ?? {
        verilen: 0,
        onaylanan: 0,
        kaybedilen: 0,
        devam: 0,
        donusumOrani: 0,
        teklifSayisi: 0,
      },
    [data, sekme]
  );

  const sicakTeklifler = useMemo(() => data?.sicakTeklifler || [], [data]);
  const anaAkis = useMemo(() => data?.anaAkis || [], [data]);
  const operasyonPlan = useMemo(() => data?.operasyonPlan || [], [data]);
  const vadesiGelenler = useMemo(() => data?.vadesiGelenler || [], [data]);
  const atelye = useMemo(() => data?.atelye || {}, [data]);

  const toplamBar = finans.onaylanan + finans.kaybedilen + finans.devam;
  const onayPct = toplamBar > 0 ? Math.round((finans.onaylanan / toplamBar) * 100) : 0;
  const devamPct = toplamBar > 0 ? Math.round((finans.devam / toplamBar) * 100) : 0;
  const kaybPct = toplamBar > 0 ? 100 - onayPct - devamPct : 0;

  const kartlar = [
    { label: "Verilen Teklif", val: finans.verilen, sub: finans.teklifSayisi + " teklif", color: "text-white", border: "border-white/10" },
    { label: "Onaylanan", val: finans.onaylanan, sub: "%" + finans.donusumOrani + " donusum", color: "text-emerald-400", border: "border-emerald-500/20" },
    { label: "Devam Eden", val: finans.devam, sub: (atelye.bekleyenOperasyon ?? 0) + " bekliyor", color: "text-blue-400", border: "border-blue-500/20" },
    { label: "Kaybedilen", val: finans.kaybedilen, sub: "%" + kaybPct + " kayip", color: "text-red-400", border: "border-red-500/20" },
  ];

  if (!data && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-500">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] px-3 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6">
      <InAppToast />
      <div className="mx-auto max-w-2xl space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Genel Bakis</p>
            <h1 className="mt-0.5 text-lg font-semibold text-white">Dashboard</h1>
          </div>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setSekme("aylik")}
              className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all " + (sekme === "aylik" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Bu Ay
            </button>
            <button
              onClick={() => setSekme("yillik")}
              className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all " + (sekme === "yillik" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Bu Yil
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {kartlar.map((k) => (
            <div key={k.label} className={"rounded-2xl border " + k.border + " bg-[#0B1120] p-4"}>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{k.label}</p>
              <p className={"mt-2 text-[22px] font-black leading-none " + k.color}>{"₺" + fmt(k.val)}</p>
              <p className="mt-1.5 text-[10px] text-slate-600">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-slate-500">Teklif dagilimi</p>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full">
            <div style={{ width: onayPct + "%", background: "#22c55e" }} className="transition-all duration-700" />
            <div style={{ width: devamPct + "%", background: "#3b82f6" }} className="transition-all duration-700" />
            <div style={{ width: kaybPct + "%", background: "#ef4444" }} className="transition-all duration-700" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              { color: "#22c55e", label: "Onaylanan", pct: onayPct },
              { color: "#3b82f6", label: "Devam", pct: devamPct },
              { color: "#ef4444", label: "Kaybedilen", pct: kaybPct },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: l.color }} />
                {l.label} %{l.pct}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-[#08111f] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-500">Satis Skoru</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Takip Edilmesi Gerekenler</p>
            </div>
            <Link href="/dashboard/isler" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white">
              Tumu
            </Link>
          </div>
          <div className="space-y-3">
            {sicakTeklifler.length === 0 && (
              <p className="text-sm text-slate-600">Su an takip gerektiren teklif yok.</p>
            )}
            {sicakTeklifler.map((t: any) => {
              const score = Number(t.ihtimal || 0);
              const phone = phoneClean(t.telefon);
              const borderColor = score >= 85 ? "border-red-500/40" : score >= 65 ? "border-amber-500/30" : "border-white/10";
              const badgeBg = score >= 85 ? "bg-red-500/15 text-red-400" : score >= 65 ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400";
              const badgeLabel = score >= 85 ? "Cok Sicak" : score >= 65 ? "Sicak" : "Takip";
              const aiPayload = {
                musteri: t.musteri,
                tutar: t.tutar,
                goruntulenme: t.goruntulenme,
                pdf: t.pdf,
                aksiyonTipi: t.aksiyonTipi,
                aksiyonSaati: t.aksiyonSaati,
                ihtimal: score,
              };
              return (
                <div key={t.teklifNo} className={"rounded-xl border " + borderColor + " bg-[#0B1120] p-3"}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{t.musteri}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{t.teklifNo}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className={"rounded-lg px-2 py-0.5 text-[11px] font-bold " + badgeBg}>
                        %{score} · {badgeLabel}
                      </span>
                      <p className="text-[11px] font-semibold text-white">{"₺" + fmt(t.tutar)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">{t.goruntulenme}x goruntulendi</span>
                    <span className="rounded-md bg-blue-950/60 px-2 py-0.5 text-[10px] text-blue-400">PDF {t.pdf}x</span>
                    {t.aksiyonMesaji && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{t.aksiyonMesaji}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.aksiyonTipi === "ara" && phone.length > 0 && (
                      <a href={telHref(phone)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white">
                        Hemen Ara
                      </a>
                    )}
                    <AiWaButon
                      label="AI WhatsApp"
                      phone={phone}
                      payload={aiPayload}
                      tip="satis"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                    />
                    <Link href="/dashboard/isler" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
                      Detay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Canli Akis</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Ekip Hareketleri</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Canli
            </span>
          </div>
          {anaAkis.length === 0 && <p className="text-sm text-slate-600">Henuz aktivite yok.</p>}
          <div
            className="space-y-0 overflow-y-auto"
            style={{ maxHeight: 380 }}
          >
            {anaAkis.map((a: any, i: number) => (
              <div key={a.id || i} className="flex items-start gap-3 border-b border-white/5 py-2.5 last:border-0">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: activityColor(a.type) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-snug text-slate-200">{a.message}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">{a.type?.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <span className="flex-shrink-0 text-[10px] text-slate-600 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
          {anaAkis.length > 0 && (
            <p className="mt-2 text-[10px] text-slate-700 text-center">Son 5 is gunu · {anaAkis.length} hareket</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4">
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Gunluk Plan</p>
            <p className="mt-0.5 text-sm font-semibold text-white">Bugunun Programi</p>
          </div>
          {operasyonPlan.length === 0 && <p className="text-sm text-slate-600">Bugun icin planlanmis operasyon yok.</p>}
          <div className="space-y-0">
            {operasyonPlan.map((o: any) => (
              <div key={o.id} className="flex items-start gap-3 border-b border-white/5 py-2.5 last:border-0">
                <span className="w-10 flex-shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-slate-500">{o.saat}</span>
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: phaseColor(o.phase) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-white">{o.tip}</p>
                    {o.tamamlandi && (
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">Tamam</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{o.musteri}{o.urun ? " · " + o.urun : ""}</p>
                </div>
              </div>
            ))}
          </div>
          {atelye.bugunOperasyon > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <span className="text-[11px] text-slate-500">{atelye.bekleyenOperasyon} bekliyor / {atelye.bugunOperasyon} toplam</span>
              <span className="text-[11px] font-semibold text-blue-400">%{atelye.doluluk} doluluk</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-[#0B1120] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-600">Tahsilat</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Vadesi Gelen Odemeler</p>
            </div>
            <Link href="/dashboard/tahsilatlar" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white">
              Tumu
            </Link>
          </div>
          {vadesiGelenler.length === 0 && <p className="text-sm text-slate-600">Vadesi gelen odeme bulunmuyor.</p>}
          <div className="space-y-0">
            {vadesiGelenler.map((v: any) => {
              const phone = phoneClean(v.musteriTelefon);
              const isGecmis = v.durum === "gecmis";
              const aiPayload = {
                musteriAdi: v.musteriAdi,
                tutar: v.tutar,
                vadeTarihi: v.vadeTarihi,
                gecenGun: v.gecenGun,
                teklifNo: v.teklifNo,
              };
              return (
                <div key={v.id} className="border-b border-white/5 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white">{v.musteriAdi}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {new Date(v.vadeTarihi).toLocaleDateString("tr-TR")}{v.teklifNo ? " · " + v.teklifNo : ""}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <p className={"text-[13px] font-black " + (isGecmis ? "text-red-400" : "text-amber-400")}>{"₺" + fmt(v.tutar)}</p>
                      {isGecmis ? (
                        <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400">{v.gecenGun}g gecti</span>
                      ) : (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">Bugun</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5">
                    {phone.length > 0 ? (
                      <AiWaButon
                        label="WA Mesaj Gonder"
                        phone={phone}
                        payload={aiPayload}
                        tip="tahsilat"
                        className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20"
                      />
                    ) : (
                      <Link
                        href={v.musteriId ? `/dashboard/musteriler?musteriId=${v.musteriId}&duzenle=1` : "/dashboard/musteriler"}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <span>Telefon kayitli degil</span>
                        <span className="text-slate-600">· Ekle</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
