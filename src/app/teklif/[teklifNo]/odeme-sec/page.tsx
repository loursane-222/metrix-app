"use client";
import { useState, useEffect, use } from "react";

type Taksit = { taksitNo: number; aciklama: string; yuzde: number; gunSonra: number };
type Sablon = { id: string; ad: string; aciklama: string; sira: number; taksitler: Taksit[] };

export default function Page({ params }: { params: Promise<{ teklifNo: string }> }) {
  const { teklifNo } = use(params);
  const [sablonlar, setSablonlar] = useState<Sablon[]>([]);
  const [toplamTutar, setToplamTutar] = useState(0);
  const [musteriAdi, setMusteriAdi] = useState("");
  const [secili, setSecili] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/teklif/${teklifNo}/odeme-sablonlari`).then(r => r.json()),
      fetch(`/api/teklif/${teklifNo}/bilgi`).then(r => r.json()),
    ]).then(([sablonData, bilgiData]) => {
      setSablonlar(sablonData.sablonlar || []);
      setToplamTutar(bilgiData.toplamTutar || 0);
      setMusteriAdi(bilgiData.musteriAdi || "");
      setYukleniyor(false);
    }).catch(() => {
      setHata("Veriler yüklenemedi.");
      setYukleniyor(false);
    });
  }, [teklifNo]);

  function para(v: number) {
    return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
  }

  const pesinAvantajOrani = 0.05;
  const pesinIndirimTutari = toplamTutar > 0 ? toplamTutar * pesinAvantajOrani : 0;
  const pesinAvantajliTutar = toplamTutar > 0 ? toplamTutar - pesinIndirimTutari : 0;
  const pesinSablon = sablonlar.find((s) => {
    const ad = String(s.ad || "").toLocaleLowerCase("tr-TR");
    const tekTaksit = s.taksitler.length === 1 && Number(s.taksitler[0]?.yuzde || 0) === 100;
    return ad.includes("peşin") || ad.includes("pesin") || tekTaksit;
  });
  const digerSablonlar = sablonlar.filter((s) => s.id !== pesinSablon?.id);
  const pesinAktif = Boolean(pesinSablon && secili === pesinSablon.id);

  async function onayla() {
    if (!secili) return;
    setGonderiyor(true);
    try {
      const res = await fetch(`/api/teklif/${teklifNo}/onayla`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sablonId: secili }),
      });
      const d = await res.json();
      if (d.redirect) window.location.href = d.redirect;
      else { setHata("Beklenmeyen hata."); setGonderiyor(false); }
    } catch {
      setHata("Bir hata oluştu, tekrar deneyin.");
      setGonderiyor(false);
    }
  }

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 760); }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#eef2f7", padding: "36px", fontFamily: "Arial, sans-serif" }}>
      {isMobile && (
        <button
          onClick={() => history.back()}
          style={{
            position: "fixed",
            top: "calc(12px + env(safe-area-inset-top, 0px))",
            left: "12px",
            zIndex: 9999,
            background: "rgba(15,23,42,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px",
            padding: "9px 16px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          ← Geri
        </button>
      )}
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "white", borderRadius: 24, padding: 28, marginBottom: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#cbd5e1", letterSpacing: 2 }}>TEKLİF ONAY</p>
          <h2 style={{ margin: 0, fontSize: 26 }}>Ödeme Planı Seçin</h2>
          {musteriAdi && (
            <p style={{ color: "#dbeafe", marginTop: 8, marginBottom: 0 }}>
              Merhaba <b>{musteriAdi}</b>, toplam tutar <b>{para(toplamTutar)}</b> için ödeme planını seçin.
            </p>
          )}
        </div>

        {yukleniyor && <p style={{ textAlign: "center", color: "#64748b" }}>Yükleniyor…</p>}
        {hata && <p style={{ textAlign: "center", color: "#dc2626" }}>{hata}</p>}

        {!yukleniyor && toplamTutar > 0 && pesinSablon && (
          <div
            onClick={() => setSecili(pesinSablon.id)}
            style={{
              position: "relative",
              overflow: "hidden",
              background: pesinAktif ? "linear-gradient(135deg,#ecfdf5,#ffffff)" : "white",
              border: `2px solid ${pesinAktif ? "#10b981" : "#bbf7d0"}`,
              borderRadius: 24,
              padding: 24,
              marginBottom: 16,
              cursor: "pointer",
              boxShadow: pesinAktif ? "0 0 0 5px rgba(16,185,129,.16), 0 24px 60px rgba(15,118,110,.16)" : "0 18px 45px rgba(15,23,42,.08)",
              transition: "all .15s",
            }}
          >
            <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "999px", right: -70, top: -90, background: "rgba(16,185,129,.12)" }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 22, color: "#064e3b" }}>Peşin Ödeme Avantajı</h3>
                  <span style={{ background: "#10b981", color: "white", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 900 }}>
                    %5 Peşin Ödeme Avantajı
                  </span>
                  {pesinAktif && <span style={{ background: "#064e3b", color: "white", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 900 }}>Seçildi</span>}
                </div>
                <p style={{ margin: "0 0 14px", color: "#047857", fontSize: 14, lineHeight: 1.55 }}>
                  Peşin ödeme avantajı ile toplam tutarınız düşer. Süreç daha hızlı netleşir ve üretim planı daha güvenli başlar.
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#94a3b8", fontSize: 15, textDecoration: "line-through", fontWeight: 800 }}>{para(toplamTutar)}</span>
                  <strong style={{ color: "#059669", fontSize: 34, lineHeight: 1, letterSpacing: "-0.04em" }}>{para(pesinAvantajliTutar)}</strong>
                </div>
              </div>
              <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 18, padding: "13px 15px", minWidth: 190 }}>
                <div style={{ color: "#047857", fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>Bugünkü avantaj</div>
                <div style={{ color: "#065f46", fontSize: 22, fontWeight: 900 }}>{para(pesinIndirimTutari)}</div>
                <div style={{ color: "#047857", fontSize: 12, marginTop: 5 }}>Bugün peşin ödeyerek avantaj elde edersiniz.</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {digerSablonlar.map((s) => {
            const aktif = secili === s.id;
            return (
              <div key={s.id} onClick={() => setSecili(s.id)} style={{ background: aktif ? "#eff6ff" : "white", border: `2px solid ${aktif ? "#2563eb" : "#e2e8f0"}`, borderRadius: 20, padding: 20, cursor: "pointer", boxShadow: aktif ? "0 0 0 4px #bfdbfe" : "none", transition: "all .15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ fontSize: 17 }}>{s.ad}</b>
                  {aktif && <span style={{ background: "#2563eb", color: "white", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>Seçildi</span>}
                </div>
                {s.aciklama && <p style={{ color: "#475569", fontSize: 13, margin: "0 0 12px" }}>{s.aciklama}</p>}
                {toplamTutar > 0 && (
                  <div style={{ background: aktif ? "#dbeafe" : "#f8fafc", border: `1px solid ${aktif ? "#bfdbfe" : "#e2e8f0"}`, borderRadius: 14, padding: "10px 12px", marginBottom: 12 }}>
                    <span style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                      Toplam Tutar
                    </span>
                    <b style={{ color: "#0f172a", fontSize: 19, letterSpacing: "-0.03em" }}>{para(toplamTutar)}</b>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {s.taksitler.map((t) => (
                    <div key={t.taksitNo} style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>{t.aciklama} — </span>
                      <b>{para((toplamTutar * t.yuzde) / 100)}</b>
                      <span style={{ color: "#94a3b8", fontSize: 11 }}> (%{t.yuzde})</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!yukleniyor && sablonlar.length > 0 && (
          <button onClick={onayla} disabled={!secili || gonderiyor} style={{ marginTop: 24, display: "block", width: "100%", background: secili ? "#16a34a" : "#94a3b8", color: "white", border: 0, borderRadius: 18, padding: 20, fontSize: 20, fontWeight: 900, cursor: secili ? "pointer" : "not-allowed" }}>
            {gonderiyor ? "İşleniyor…" : "✔ Onayla ve Devam Et"}
          </button>
        )}
      </div>
    </main>
  );
}
