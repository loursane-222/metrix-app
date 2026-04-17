"use client";

import { useState, useRef, useEffect } from "react";

// ─── Tipler ───────────────────────────────────────────────────
const YON_SECENEKLERI = ["Enine", "Boyuna", "Serbest"];

const SABIT_ALANLAR = [
  "Ön Alın",
  "Tezgah",
  "Tezgah Arası",
  "L Tezgah Dönüş",
  "Ada",
  "Ada Tezgah Ayak",
  "Ada Tezgah Ayak Kalınlığı",
];

interface KesimDetay {
  en: string;
  boy: string;
  on: string;
  arka: string;
  yon: string;
}

interface KesimAlani {
  id: string;
  baslik: string;
  detay: KesimDetay;
  aktif: boolean;
}

interface UrunBilgisi {
  urunAdi: string;
  marka: string;
  yuzey: string;
  plakaEni: string;
  plakaBoy: string;
  gorselUrl: string | null;
}

interface YerlesilenParca {
  id: string;
  baslik: string;
  x: number;
  y: number;
  en: number;
  boy: number;
  renk: string;
}

const RENKLER = [
  "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6366F1",
  "#14B8A6", "#F43F5E",
];

const bos: KesimDetay = { en: "", boy: "", on: "", arka: "", yon: "Serbest" };

// ─── Ana Bileşen ──────────────────────────────────────────────
export function PlakaPlanlayici() {
  const [urun, setUrun] = useState<UrunBilgisi>({
    urunAdi: "", marka: "", yuzey: "", plakaEni: "", plakaBoy: "", gorselUrl: null,
  });

  const [sabitAlanlar, setSabitAlanlar] = useState<KesimAlani[]>(
    SABIT_ALANLAR.map((baslik, i) => ({
      id: `sabit-${i}`,
      baslik,
      detay: { ...bos },
      aktif: false,
    }))
  );

  const [ozelAlanlar, setOzelAlanlar] = useState<KesimAlani[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: `ozel-${i}`,
      baslik: "",
      detay: { ...bos },
      aktif: false,
    }))
  );

  const [modalAcik, setModalAcik] = useState(false);
  const [aktifAlan, setAktifAlan] = useState<KesimAlani | null>(null);
  const [aktifTip, setAktifTip] = useState<"sabit" | "ozel">("sabit");
  const [aktifIndex, setAktifIndex] = useState(0);
  const [geciciDetay, setGeciciDetay] = useState<KesimDetay>({ ...bos });
  const [yerlesim, setYerlesim] = useState<YerlesilenParca[]>([]);
  const [uyari, setUyari] = useState<string[]>([]);
  const [hesaplandi, setHesaplandi] = useState(false);
  const gorselRef = useRef<HTMLInputElement>(null);

  function modalAc(tip: "sabit" | "ozel", index: number) {
    const alan = tip === "sabit" ? sabitAlanlar[index] : ozelAlanlar[index];
    setAktifAlan(alan);
    setAktifTip(tip);
    setAktifIndex(index);
    setGeciciDetay({ ...alan.detay });
    setModalAcik(true);
  }

  function modalKaydet() {
    if (aktifTip === "sabit") {
      setSabitAlanlar((prev) => {
        const yeni = [...prev];
        yeni[aktifIndex] = { ...yeni[aktifIndex], detay: geciciDetay, aktif: !!(geciciDetay.en && geciciDetay.boy) };
        return yeni;
      });
    } else {
      setOzelAlanlar((prev) => {
        const yeni = [...prev];
        yeni[aktifIndex] = { ...yeni[aktifIndex], detay: geciciDetay, aktif: !!(geciciDetay.en && geciciDetay.boy) };
        return yeni;
      });
    }
    setModalAcik(false);
  }

  function gorselYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUrun((prev) => ({ ...prev, gorselUrl: url }));
  }

  // ─── Yerleşim Algoritması ─────────────────────────────────
  function hesapla() {
    setUyari([]);
    setHesaplandi(false);

    const plakaEni = parseFloat(urun.plakaEni);
    const plakaBoy = parseFloat(urun.plakaBoy);

    if (!plakaEni || !plakaBoy) {
      setUyari(["Plaka eni ve boyu girilmeden hesaplama yapılamaz."]);
      return;
    }

    const parcalar: { id: string; baslik: string; en: number; boy: number }[] = [];
    const tumAlanlar = [...sabitAlanlar, ...ozelAlanlar];

    for (const alan of tumAlanlar) {
      if (!alan.aktif) continue;
      const en = parseFloat(alan.detay.en);
      const boy = parseFloat(alan.detay.boy);
      if (!en || !boy) continue;
      parcalar.push({ id: alan.id, baslik: alan.baslik || alan.id, en, boy });
    }

    if (parcalar.length === 0) {
      setUyari(["Hiç kesim alanı girilmedi."]);
      return;
    }

    // Büyükten küçüğe sırala
    parcalar.sort((a, b) => (b.en * b.boy) - (a.en * a.boy));

    // Basit yerleştirme: satır satır
    const yerlesimler: YerlesilenParca[] = [];
    const uyarilar: string[] = [];
    let mevcutX = 0;
    let mevcutY = 0;
    let satirYuksekligi = 0;

    parcalar.forEach((parca, i) => {
      const renk = RENKLER[i % RENKLER.length];

      if (parca.en > plakaEni || parca.boy > plakaBoy) {
        uyarilar.push(`"${parca.baslik}" parçası plakadan büyük, yerleştirilemedi.`);
        return;
      }

      // Satıra sığmıyorsa alt satıra geç
      if (mevcutX + parca.en > plakaEni) {
        mevcutX = 0;
        mevcutY += satirYuksekligi;
        satirYuksekligi = 0;
      }

      // Plaka boyunu aştı mı?
      if (mevcutY + parca.boy > plakaBoy) {
        uyarilar.push(`"${parca.baslik}" parçası için plakada yeterli yer kalmadı.`);
        return;
      }

      yerlesimler.push({
        id: parca.id,
        baslik: parca.baslik,
        x: mevcutX,
        y: mevcutY,
        en: parca.en,
        boy: parca.boy,
        renk,
      });

      mevcutX += parca.en;
      if (parca.boy > satirYuksekligi) satirYuksekligi = parca.boy;
    });

    setYerlesim(yerlesimler);
    setUyari(uyarilar);
    setHesaplandi(true);
  }

  // ─── İstatistikler ────────────────────────────────────────
  const plakaEni = parseFloat(urun.plakaEni) || 0;
  const plakaBoy = parseFloat(urun.plakaBoy) || 0;
  const toplamPlaka = plakaEni * plakaBoy;
  const kullanilanAlan = yerlesim.reduce((acc, p) => acc + p.en * p.boy, 0);
  const bosAlan = toplamPlaka - kullanilanAlan;
  const fireOrani = toplamPlaka > 0 ? ((bosAlan / toplamPlaka) * 100).toFixed(1) : "0";

  // Görsel ölçek
  const CANVAS_EN = 500;
  const CANVAS_BOY = plakaEni > 0 && plakaBoy > 0 ? Math.round((plakaBoy / plakaEni) * CANVAS_EN) : 300;
  const olcek = plakaEni > 0 ? CANVAS_EN / plakaEni : 1;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Plaka Yerleşim Planlayıcı</h1>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>Plaka ölçülerini ve kesim alanlarını girerek fire oranını hesaplayın.</p>

      {/* ─── Ürün Bilgisi ─── */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Ürün Bilgisi</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { label: "Ürün Adı", key: "urunAdi" },
            { label: "Marka", key: "marka" },
            { label: "Yüzey", key: "yuzey" },
            { label: "Plaka Eni (cm)", key: "plakaEni" },
            { label: "Plaka Boyu (cm)", key: "plakaBoy" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>{label}</label>
              <input
                type={key.includes("plaka") || key.includes("Plaka") ? "number" : "text"}
                value={(urun as any)[key]}
                onChange={(e) => setUrun((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 10px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>

        {/* Görsel Yükleme */}
        <div style={{ marginTop: "16px" }}>
          <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "6px" }}>Plaka Görseli</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => gorselRef.current?.click()}
              style={{ padding: "8px 16px", border: "1px dashed #d1d5db", borderRadius: "8px", background: "#f9fafb", cursor: "pointer", fontSize: "13px", color: "#6b7280" }}
            >
              📁 Görsel Yükle
            </button>
            {urun.gorselUrl && (
              <img src={urun.gorselUrl} alt="plaka" style={{ height: "48px", width: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
            )}
            <input ref={gorselRef} type="file" accept="image/*" style={{ display: "none" }} onChange={gorselYukle} />
          </div>
        </div>
      </div>

      {/* ─── Sabit Kesim Alanları ─── */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Sabit Kesim Alanları</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {sabitAlanlar.map((alan, i) => (
            <div key={alan.id} style={{ border: `1px solid ${alan.aktif ? "#3b82f6" : "#e5e7eb"}`, borderRadius: "10px", padding: "12px", background: alan.aktif ? "#eff6ff" : "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{alan.baslik}</span>
                {alan.aktif && <span style={{ fontSize: "10px", background: "#3b82f6", color: "white", borderRadius: "20px", padding: "2px 8px" }}>Girildi</span>}
              </div>
              {alan.aktif && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                  {alan.detay.en} × {alan.detay.boy} cm — {alan.detay.yon}
                </div>
              )}
              <button
                onClick={() => modalAc("sabit", i)}
                style={{ marginTop: "8px", width: "100%", padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "12px", color: "#374151" }}
              >
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Özel Alanlar ─── */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Diğer Kesim Ölçüleri</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {ozelAlanlar.map((alan, i) => (
            <div key={alan.id} style={{ border: `1px solid ${alan.aktif ? "#10b981" : "#e5e7eb"}`, borderRadius: "10px", padding: "12px", background: alan.aktif ? "#f0fdf4" : "#f9fafb" }}>
              <input
                type="text"
                placeholder={`Özel Alan ${i + 1}`}
                value={alan.baslik}
                onChange={(e) => setOzelAlanlar((prev) => { const y = [...prev]; y[i] = { ...y[i], baslik: e.target.value }; return y; })}
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", marginBottom: "6px", boxSizing: "border-box" }}
              />
              {alan.aktif && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                  {alan.detay.en} × {alan.detay.boy} cm — {alan.detay.yon}
                </div>
              )}
              <button
                onClick={() => modalAc("ozel", i)}
                style={{ width: "100%", padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "12px", color: "#374151" }}
              >
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Hesapla Butonu ─── */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <button
          onClick={hesapla}
          style={{ padding: "12px 40px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
        >
          🔲 Yerleşimi Hesapla
        </button>
      </div>

      {/* ─── Uyarılar ─── */}
      {uyari.length > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
          {uyari.map((u, i) => <div key={i} style={{ fontSize: "13px", color: "#92400e" }}>⚠ {u}</div>)}
        </div>
      )}

      {/* ─── Sonuç ─── */}
      {hesaplandi && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Sonuç</h2>

          {/* İstatistikler */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Kullanılan Alan</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1d4ed8" }}>{kullanilanAlan.toFixed(0)} cm²</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Boş Alan</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>{bosAlan.toFixed(0)} cm²</div>
            </div>
            <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Fire Oranı</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#dc2626" }}>%{fireOrani}</div>
            </div>
          </div>

          {/* Plaka Görseli */}
          <div style={{ overflowX: "auto" }}>
            <div style={{ position: "relative", width: CANVAS_EN, height: CANVAS_BOY, background: "#f1f5f9", border: "2px solid #94a3b8", borderRadius: "4px", margin: "0 auto" }}>
              {urun.gorselUrl && (
                <img src={urun.gorselUrl} alt="plaka bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, borderRadius: "2px" }} />
              )}
              {yerlesim.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: p.x * olcek,
                    top: p.y * olcek,
                    width: p.en * olcek,
                    height: p.boy * olcek,
                    background: p.renk + "33",
                    border: `2px solid ${p.renk}`,
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ fontSize: "9px", fontWeight: "600", color: p.renk, textAlign: "center", padding: "2px", lineHeight: 1.2 }}>
                    {p.baslik}<br />{p.en}×{p.boy}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Parça Listesi */}
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>Yerleştirilen Parçalar</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {yerlesim.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f9fafb", borderRadius: "8px", fontSize: "13px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: p.renk, flexShrink: 0 }} />
                  <span style={{ fontWeight: "500", flex: 1 }}>{p.baslik}</span>
                  <span style={{ color: "#6b7280" }}>{p.en} × {p.boy} cm</span>
                  <span style={{ color: "#6b7280" }}>{(p.en * p.boy).toFixed(0)} cm²</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ─── */}
      {modalAcik && aktifAlan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>{aktifAlan.baslik || "Özel Alan"}</h3>
              <button onClick={() => setModalAcik(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { label: "En (cm)", key: "en" },
                { label: "Boy (cm)", key: "boy" },
                { label: "Ön (cm)", key: "on" },
                { label: "Arka (cm)", key: "arka" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>{label}</label>
                  <input
                    type="number"
                    value={(geciciDetay as any)[key]}
                    onChange={(e) => setGeciciDetay((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 10px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Yön</label>
              <select
                value={geciciDetay.yon}
                onChange={(e) => setGeciciDetay((prev) => ({ ...prev, yon: e.target.value }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 10px", fontSize: "14px" }}
              >
                {YON_SECENEKLERI.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setModalAcik(false)} style={{ flex: 1, padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "14px" }}>
                İptal
              </button>
              <button onClick={modalKaydet} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#1d4ed8", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
