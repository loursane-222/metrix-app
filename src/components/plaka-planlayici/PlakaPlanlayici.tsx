"use client";

import { useState, useRef } from "react";

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
  sira: number;
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
  "#2563eb","#d97706","#059669","#dc2626","#7c3aed",
  "#0891b2","#ea580c","#65a30d","#db2777","#4f46e5",
];

const bos: KesimDetay = { en: "", boy: "", on: "", arka: "", yon: "Serbest" };

export function PlakaPlanlayici() {
  const [urun, setUrun] = useState<UrunBilgisi>({
    urunAdi: "", marka: "", yuzey: "", plakaEni: "", plakaBoy: "", gorselUrl: null,
  });

  const [sabitAlanlar, setSabitAlanlar] = useState<KesimAlani[]>(
    SABIT_ALANLAR.map((baslik, i) => ({
      id: `sabit-${i}`, baslik, detay: { ...bos }, aktif: false, sira: i,
    }))
  );

  const [ozelAlanlar, setOzelAlanlar] = useState<KesimAlani[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: `ozel-${i}`, baslik: "", detay: { ...bos }, aktif: false, sira: 100 + i,
    }))
  );

  const [modalAcik, setModalAcik] = useState(false);
  const [aktifTip, setAktifTip] = useState<"sabit" | "ozel">("sabit");
  const [aktifIndex, setAktifIndex] = useState(0);
  const [geciciDetay, setGeciciDetay] = useState<KesimDetay>({ ...bos });
  const [yerlesim, setYerlesim] = useState<YerlesilenParca[]>([]);
  const [uyari, setUyari] = useState<string[]>([]);
  const [hesaplandi, setHesaplandi] = useState(false);
  const gorselRef = useRef<HTMLInputElement>(null);

  function modalAc(tip: "sabit" | "ozel", index: number) {
    const alan = tip === "sabit" ? sabitAlanlar[index] : ozelAlanlar[index];
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

  function hesapla() {
    setUyari([]);
    setHesaplandi(false);
    const plakaEni = parseFloat(urun.plakaEni);
    const plakaBoy = parseFloat(urun.plakaBoy);

    if (!plakaEni || !plakaBoy) {
      setUyari(["Plaka eni ve boyu girilmeden hesaplama yapılamaz."]);
      return;
    }

    // Aktif alanları sıraya göre al
    const tumAlanlar = [...sabitAlanlar, ...ozelAlanlar]
      .filter((a) => a.aktif && parseFloat(a.detay.en) > 0 && parseFloat(a.detay.boy) > 0)
      .sort((a, b) => a.sira - b.sira);

    if (tumAlanlar.length === 0) {
      setUyari(["Hiç kesim alanı girilmedi."]);
      return;
    }

    const parcalar = tumAlanlar.map((a) => ({
      id: a.id,
      baslik: a.baslik || a.id,
      en: parseFloat(a.detay.en),
      boy: parseFloat(a.detay.boy),
    }));

    // Büyükten küçüğe sırala (sabit alanlar kendi sırasında kalır)
    // Sabit alanları sırayla, özel alanları büyükten küçüğe
    const sabitSirali = parcalar.filter((p) => p.id.startsWith("sabit"));
    const ozelSirali = parcalar
      .filter((p) => p.id.startsWith("ozel"))
      .sort((a, b) => b.en * b.boy - a.en * a.boy);
    const sirali = [...sabitSirali, ...ozelSirali];

    const yerlesimler: YerlesilenParca[] = [];
    const uyarilar: string[] = [];
    let mevcutX = 0;
    let mevcutY = 0;
    let satirYuksekligi = 0;

    sirali.forEach((parca, i) => {
      const renk = RENKLER[i % RENKLER.length];
      if (parca.en > plakaEni || parca.boy > plakaBoy) {
        uyarilar.push(`"${parca.baslik}" parçası plakadan büyük, yerleştirilemedi.`);
        return;
      }
      if (mevcutX + parca.en > plakaEni) {
        mevcutX = 0;
        mevcutY += satirYuksekligi;
        satirYuksekligi = 0;
      }
      if (mevcutY + parca.boy > plakaBoy) {
        uyarilar.push(`"${parca.baslik}" için plakada yer kalmadı.`);
        return;
      }
      yerlesimler.push({ id: parca.id, baslik: parca.baslik, x: mevcutX, y: mevcutY, en: parca.en, boy: parca.boy, renk });
      mevcutX += parca.en;
      if (parca.boy > satirYuksekligi) satirYuksekligi = parca.boy;
    });

    setYerlesim(yerlesimler);
    setUyari(uyarilar);
    setHesaplandi(true);
  }

  const plakaEni = parseFloat(urun.plakaEni) || 0;
  const plakaBoy = parseFloat(urun.plakaBoy) || 0;
  const toplamPlaka = plakaEni * plakaBoy;
  const kullanilanAlan = yerlesim.reduce((acc, p) => acc + p.en * p.boy, 0);
  const bosAlan = toplamPlaka - kullanilanAlan;
  const fireOrani = toplamPlaka > 0 ? ((bosAlan / toplamPlaka) * 100).toFixed(1) : "0";

  // Plaka her zaman yatay: en > boy olacak şekilde
  const CANVAS_EN = 560;
  const oran = plakaEni > 0 && plakaBoy > 0 ? plakaBoy / plakaEni : 0.5;
  const CANVAS_BOY = Math.round(CANVAS_EN * oran);
  const olcek = plakaEni > 0 ? CANVAS_EN / plakaEni : 1;

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Plaka Yerleşim Planlayıcı</h1>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>Kesim ölçülerini girin, fire oranını hesaplayın.</p>

      {/* Ürün Bilgisi */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>Ürün Bilgisi</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Ürün Adı", key: "urunAdi", tip: "text" },
            { label: "Marka", key: "marka", tip: "text" },
            { label: "Yüzey", key: "yuzey", tip: "text" },
            { label: "Plaka Eni (cm)", key: "plakaEni", tip: "number" },
            { label: "Plaka Boyu (cm)", key: "plakaBoy", tip: "number" },
          ].map(({ label, key, tip }) => (
            <div key={key}>
              <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "4px" }}>{label}</label>
              <input
                type={tip}
                value={(urun as any)[key]}
                onChange={(e) => setUrun((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "14px" }}>
          <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "6px" }}>Plaka Görseli (yatay yükleyin)</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => gorselRef.current?.click()}
              style={{ padding: "7px 14px", border: "1px dashed #d1d5db", borderRadius: "8px", background: "#f9fafb", cursor: "pointer", fontSize: "12px", color: "#6b7280" }}>
              📁 Görsel Yükle
            </button>
            {urun.gorselUrl && (
              <img src={urun.gorselUrl} alt="plaka"
                style={{ height: "44px", width: "88px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
            )}
            <input ref={gorselRef} type="file" accept="image/*" style={{ display: "none" }} onChange={gorselYukle} />
          </div>
        </div>
      </div>

      {/* Sabit Kesim Alanları */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>Sabit Kesim Alanları</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          {sabitAlanlar.map((alan, i) => (
            <div key={alan.id} style={{ border: `1px solid ${alan.aktif ? RENKLER[i % RENKLER.length] : "#e5e7eb"}`, borderRadius: "10px", padding: "12px", background: alan.aktif ? RENKLER[i % RENKLER.length] + "11" : "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{alan.baslik}</span>
                {alan.aktif && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: RENKLER[i % RENKLER.length], display: "inline-block" }} />}
              </div>
              {alan.aktif && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>
                  {alan.detay.en} × {alan.detay.boy} cm · {alan.detay.yon}
                </div>
              )}
              <button onClick={() => modalAc("sabit", i)}
                style={{ width: "100%", padding: "5px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "11px", color: "#374151" }}>
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Özel Alanlar */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>Diğer Kesim Ölçüleri</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          {ozelAlanlar.map((alan, i) => (
            <div key={alan.id} style={{ border: `1px solid ${alan.aktif ? RENKLER[(sabitAlanlar.length + i) % RENKLER.length] : "#e5e7eb"}`, borderRadius: "10px", padding: "12px", background: alan.aktif ? RENKLER[(sabitAlanlar.length + i) % RENKLER.length] + "11" : "#f9fafb" }}>
              <input
                type="text"
                placeholder={`Özel Alan ${i + 1}`}
                value={alan.baslik}
                onChange={(e) => setOzelAlanlar((prev) => { const y = [...prev]; y[i] = { ...y[i], baslik: e.target.value }; return y; })}
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }}
              />
              {alan.aktif && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>
                  {alan.detay.en} × {alan.detay.boy} cm · {alan.detay.yon}
                </div>
              )}
              <button onClick={() => modalAc("ozel", i)}
                style={{ width: "100%", padding: "5px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "11px", color: "#374151" }}>
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hesapla */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <button onClick={hesapla}
          style={{ padding: "12px 40px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
          🔲 Yerleşimi Hesapla
        </button>
      </div>

      {/* Uyarılar */}
      {uyari.length > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
          {uyari.map((u, i) => <div key={i} style={{ fontSize: "13px", color: "#92400e" }}>⚠ {u}</div>)}
        </div>
      )}

      {/* Sonuç */}
      {hesaplandi && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px" }}>Sonuç</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
            <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Kullanılan Alan</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1d4ed8" }}>{kullanilanAlan.toFixed(0)} cm²</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Boş Alan</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>{bosAlan.toFixed(0)} cm²</div>
            </div>
            <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Fire Oranı</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#dc2626" }}>%{fireOrani}</div>
            </div>
          </div>

          {/* Plaka Görsel — her zaman yatay */}
          <div style={{ overflowX: "auto", marginBottom: "20px" }}>
            <div style={{ position: "relative", width: CANVAS_EN, height: CANVAS_BOY, margin: "0 auto", borderRadius: "4px", overflow: "hidden", border: "2px solid #94a3b8" }}>
              {/* Plaka görseli arka plan — tam kaplıyor, orijinal görünüyor */}
              {urun.gorselUrl ? (
                <img
                  src={urun.gorselUrl}
                  alt="plaka"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #e2d9c8 0%, #d4c9b0 50%, #c8bda0 100%)" }} />
              )}

              {/* Kesim parçaları — saydam dolgu, kalın renkli çerçeve */}
              {yerlesim.map((p) => (
                <div key={p.id} style={{
                  position: "absolute",
                  left: p.x * olcek,
                  top: p.y * olcek,
                  width: p.en * olcek,
                  height: p.boy * olcek,
                  background: p.renk + "22",
                  border: `2px solid ${p.renk}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}>
                  <div style={{
                    background: p.renk + "cc",
                    borderRadius: "3px",
                    padding: "2px 4px",
                    fontSize: "9px",
                    fontWeight: "700",
                    color: "white",
                    textAlign: "center",
                    lineHeight: 1.3,
                    maxWidth: "90%",
                  }}>
                    {p.baslik}<br />{p.en}×{p.boy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parça Listesi */}
          <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Yerleştirilen Parçalar</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {yerlesim.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f9fafb", borderRadius: "8px", fontSize: "13px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: p.renk, flexShrink: 0 }} />
                <span style={{ fontWeight: "500", flex: 1 }}>{p.baslik}</span>
                <span style={{ color: "#6b7280" }}>{p.en} × {p.boy} cm</span>
                <span style={{ color: "#9ca3af" }}>{(p.en * p.boy).toFixed(0)} cm²</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAcik && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>
                {aktifTip === "sabit" ? sabitAlanlar[aktifIndex].baslik : (ozelAlanlar[aktifIndex].baslik || `Özel Alan ${aktifIndex + 1}`)}
              </h3>
              <button onClick={() => setModalAcik(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "En (cm)", key: "en" },
                { label: "Boy (cm)", key: "boy" },
                { label: "Ön (cm)", key: "on" },
                { label: "Arka (cm)", key: "arka" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "4px" }}>{label}</label>
                  <input
                    type="number"
                    value={(geciciDetay as any)[key]}
                    onChange={(e) => setGeciciDetay((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: "10px" }}>
              <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Yön</label>
              <select
                value={geciciDetay.yon}
                onChange={(e) => setGeciciDetay((prev) => ({ ...prev, yon: e.target.value }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "7px 10px", fontSize: "13px" }}
              >
                {YON_SECENEKLERI.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button onClick={() => setModalAcik(false)}
                style={{ flex: 1, padding: "9px", border: "1px solid #d1d5db", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "13px" }}>
                İptal
              </button>
              <button onClick={modalKaydet}
                style={{ flex: 1, padding: "9px", border: "none", borderRadius: "8px", background: "#1d4ed8", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
