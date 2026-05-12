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

  return (
    <main style={{ minHeight: "100vh", background: "#eef2f7", padding: "36px", fontFamily: "Arial, sans-serif" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {sablonlar.map((s) => {
            const aktif = secili === s.id;
            return (
              <div key={s.id} onClick={() => setSecili(s.id)} style={{ background: aktif ? "#eff6ff" : "white", border: `2px solid ${aktif ? "#2563eb" : "#e2e8f0"}`, borderRadius: 20, padding: 20, cursor: "pointer", boxShadow: aktif ? "0 0 0 4px #bfdbfe" : "none", transition: "all .15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ fontSize: 17 }}>{s.ad}</b>
                  {aktif && <span style={{ background: "#2563eb", color: "white", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>Seçildi</span>}
                </div>
                {s.aciklama && <p style={{ color: "#475569", fontSize: 13, margin: "0 0 12px" }}>{s.aciklama}</p>}
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
