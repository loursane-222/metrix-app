"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Taksit = {
  id: string; taksitNo: number; aciklama: string;
  vadeTarihi: string; tutar: number; odendiMi: boolean; odenmeTarihi?: string;
};
type OdemePlani = {
  id: string; toplamTutar: number; musteriTipi: string; taksitler: Taksit[];
};
type Tahsilat = {
  id: string; tarih: string; tutar: number;
  is?: { id: string; teklifNo: string; urunAdi: string; satisFiyati: number };
};
type Is = {
  id: string; teklifNo: string; urunAdi: string; satisFiyati: number;
  durum: string; musteriTipi: string; tahsilat: number;
};
type Musteri = {
  id: string; ad: string; firmaAdi?: string; telefon?: string; musteriTipi: string;
};

function tl(v: number) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}
function tarihFmt(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
function tarihInput(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}
function gunFarki(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
function gunEkle(d: Date, gun: number) {
  const r = new Date(d); r.setDate(r.getDate() + gun); return r;
}
const MUSTERI_TIP: Record<string, string> = {
  bayi: "Bayi", mimar: "Mimar", muteahhit: "Müteahhit",
  son_kullanici: "Ev Sahibi", imalatci: "İmalatçı",
};

function defaultTaksitler(musteriTipi: string, toplamTutar: number, baslangic: Date) {
  const yapilar: Record<string, { aciklama: string; yuzde: number; gunSonra: number }[]> = {
    bayi: [
      { aciklama: "Peşinat (%30)", yuzde: 30, gunSonra: 0 },
      { aciklama: "Teslimatta (%70)", yuzde: 70, gunSonra: 30 },
    ],
    mimar: [
      { aciklama: "Peşinat (%25)", yuzde: 25, gunSonra: 0 },
      { aciklama: "İmalat başlangıcı (%25)", yuzde: 25, gunSonra: 15 },
      { aciklama: "Teslimatta (%50)", yuzde: 50, gunSonra: 30 },
    ],
    muteahhit: [
      { aciklama: "Peşinat (%20)", yuzde: 20, gunSonra: 0 },
      { aciklama: "İmalat başlangıcı (%30)", yuzde: 30, gunSonra: 15 },
      { aciklama: "Hak ediş (%50)", yuzde: 50, gunSonra: 45 },
    ],
    imalatci: [
      { aciklama: "Peşinat (%30)", yuzde: 30, gunSonra: 0 },
      { aciklama: "İş bitiminde (%70)", yuzde: 70, gunSonra: 30 },
    ],
    son_kullanici: [
      { aciklama: "Peşinat (%50)", yuzde: 50, gunSonra: 0 },
      { aciklama: "Teslimatta (%50)", yuzde: 50, gunSonra: 30 },
    ],
  };
  const yapi = yapilar[musteriTipi] || yapilar.son_kullanici;
  return yapi.map((t, i) => ({
    taksitNo: i + 1,
    aciklama: t.aciklama,
    tutar: Math.round((toplamTutar * t.yuzde) / 100 * 100) / 100,
    vadeTarihi: tarihInput(gunEkle(baslangic, t.gunSonra)),
    odendiMi: false,
  }));
}

type Sekme = "musteri" | "tahsilat" | "plan" | "sablon";

export default function TahsilatlarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isIdParam = searchParams.get("isId");
  const musteriIdParam = searchParams.get("musteriId");

  const [musteriler, setMusteriler]         = useState<Musteri[]>([]);
  const [seciliMusteri, setSeciliMusteri]   = useState<Musteri | null>(null);
  const [musteriArama, setMusteriArama]     = useState("");
  const [listeAcik, setListeAcik]           = useState(false);
  const [isler, setIsler]                   = useState<Is[]>([]);
  const [tahsilatlar, setTahsilatlar]       = useState<Tahsilat[]>([]);
  const [aktifIs, setAktifIs]               = useState<Is | null>(null);
  const [odemePlani, setOdemePlani]         = useState<OdemePlani | null>(null);
  const [yukleniyor, setYukleniyor]         = useState(false);
  const [planYukleniyor, setPlanYukleniyor] = useState(false);
  const [yeniTutar, setYeniTutar]           = useState("");
  const [yeniTarih, setYeniTarih]           = useState(new Date().toISOString().slice(0, 10));
  const [kaydediliyor, setKaydediliyor]     = useState(false);
  const [bugunListesi, setBugunListesi]     = useState<any[]>([]);
  const [taksitDuzenle, setTaksitDuzenle]   = useState(false);
  const [draftTaksitler, setDraftTaksitler] = useState<any[]>([]);
  const [planKaydediliyor, setPlanKaydediliyor] = useState(false);
  const [aktifSekme, setAktifSekme]         = useState<Sekme>("musteri");
  const [sablonlar, setSablonlar]           = useState<any[]>([]);
  const [sablonYukleniyor, setSablonYukleniyor] = useState(false);
  const [sablonDuzenle, setSablonDuzenle]   = useState<any | null>(null);
  const [sablonSil, setSablonSil]           = useState<string | null>(null);
  const [aktifTip, setAktifTip]             = useState("bayi");
  const [taksitOnay, setTaksitOnay]         = useState<{id: string, tutar: number, aciklama: string} | null>(null);
  const [taksitOnayTutar, setTaksitOnayTutar] = useState("");
  const [taksitOnayYukleniyor, setTaksitOnayYukleniyor] = useState(false);

  useEffect(() => {
    fetch("/api/musteriler-lite?borclu=1").then(r => r.json()).then(v => setMusteriler(v.musteriler || []));
    fetchSablonlar();
    fetch("/api/odeme-plani?bugun=1").then(r => r.json()).then(v => setBugunListesi(v.bugunListesi || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isIdParam || !musteriler.length) return;
    fetch(`/api/isler/${isIdParam}`).then(r => r.json()).then(v => {
      if (v?.musteriId) {
        const m = musteriler.find(x => x.id === v.musteriId);
        if (m) musteriSec(m, v.id);
      }
    });
  }, [isIdParam, musteriler]);

  useEffect(() => {
    if (!musteriIdParam || !musteriler.length) return;
    const m = musteriler.find(x => x.id === musteriIdParam);
    if (m) musteriSec(m);
  }, [musteriIdParam, musteriler]);

  const fetchSablonlar = async () => {
    setSablonYukleniyor(true);
    try {
      const res = await fetch("/api/odeme-sablonlari").then(r => r.json());
      setSablonlar(res.sablonlar || []);
    } finally { setSablonYukleniyor(false); }
  };

  const sablonKaydet = async (sablon: any) => {
    const method = sablon.id && !sablon.id.startsWith("default_") ? "PUT" : "POST";
    const res = await fetch("/api/odeme-sablonlari", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sablon),
    }).then(r => r.json());
    if (res.sablon || res.hata === undefined) await fetchSablonlar();
    setSablonDuzenle(null);
  };

  const sablonSilFn = async (id: string) => {
    if (id.startsWith("default_")) return;
    await fetch(`/api/odeme-sablonlari?id=${id}`, { method: "DELETE" });
    await fetchSablonlar();
    setSablonSil(null);
  };

  const musteriSec = useCallback(async (m: Musteri, autoIsId?: string) => {
    setSeciliMusteri(m); setListeAcik(false); setMusteriArama("");
    setAktifIs(null); setOdemePlani(null); setYukleniyor(true);
    try {
      const [isRes, tahRes] = await Promise.all([
        fetch(`/api/isler?musteriId=${m.id}`).then(r => r.json()),
        fetch(`/api/tahsilatlar?musteriId=${m.id}`).then(r => r.json()),
      ]);
      const islerData: Is[] = (isRes.isler || []).filter(
        (i: Is) => i.durum !== "kaybedildi" && Number(i.satisFiyati) > Number(i.tahsilat || 0)
      );
      setIsler(islerData);
      setTahsilatlar(tahRes.tahsilatlar || []);
      const hedefId = autoIsId || isIdParam;
      if (hedefId) {
        const is = islerData.find(x => x.id === hedefId);
        if (is) { await isSec(is, m); setAktifSekme("plan"); }
      } else {
        setAktifSekme("musteri");
      }
    } finally { setYukleniyor(false); }
  }, [isIdParam]);

  const isSec = useCallback(async (is: Is, musteri?: Musteri | null) => {
    setAktifIs(is); setPlanYukleniyor(true); setTaksitDuzenle(false);
    try {
      const res = await fetch(`/api/odeme-plani?isId=${is.id}`).then(r => r.json());
      if (res.plan) {
        setOdemePlani(res.plan);
        setDraftTaksitler(res.plan.taksitler.map((t: Taksit) => ({ ...t, vadeTarihi: tarihInput(t.vadeTarihi) })));
      } else {
        const m = musteri || seciliMusteri;
        const tip = m?.musteriTipi || is.musteriTipi || "son_kullanici";
        const draft = defaultTaksitler(tip, Number(is.satisFiyati), new Date());
        setOdemePlani(null);
        setDraftTaksitler(draft);
        setTaksitDuzenle(true);
      }
    } finally { setPlanYukleniyor(false); }
  }, [seciliMusteri]);

  function taksitSayisiDegistir(yeniSayi: number) {
    if (!aktifIs) return;
    const toplamTutar = Number(aktifIs.satisFiyati);
    const baslangic = new Date();
    const yeni = [];
    for (let i = 0; i < yeniSayi; i++) {
      const mevcut = draftTaksitler[i];
      yeni.push({
        id: mevcut?.id,
        taksitNo: i + 1,
        aciklama: mevcut?.aciklama || `${i + 1}. Taksit`,
        tutar: mevcut?.tutar || Math.round((toplamTutar / yeniSayi) * 100) / 100,
        vadeTarihi: mevcut?.vadeTarihi || tarihInput(gunEkle(baslangic, i * 30)),
        odendiMi: mevcut?.odendiMi || false,
      });
    }
    setDraftTaksitler(yeni);
  }

  function draftGuncelle(idx: number, patch: any) {
    setDraftTaksitler(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
  }

  async function planKaydet() {
    if (!aktifIs || !seciliMusteri) return;
    setPlanKaydediliyor(true);
    try {
      if (!odemePlani) {
        const res = await fetch("/api/odeme-plani", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isId: aktifIs.id, taksitler: draftTaksitler }),
        }).then(r => r.json());
        if (res.plan) {
          setOdemePlani(res.plan);
          setDraftTaksitler(res.plan.taksitler.map((t: Taksit) => ({ ...t, vadeTarihi: tarihInput(t.vadeTarihi) })));
        }
      } else {
        for (const t of draftTaksitler) {
          if (t.id) {
            await fetch("/api/odeme-plani", {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taksitId: t.id, odendiMi: t.odendiMi, vadeTarihi: t.vadeTarihi, aciklama: t.aciklama, tutar: t.tutar }),
            });
          }
        }
        const res = await fetch(`/api/odeme-plani?isId=${aktifIs.id}`).then(r => r.json());
        if (res.plan) {
          setOdemePlani(res.plan);
          setDraftTaksitler(res.plan.taksitler.map((t: Taksit) => ({ ...t, vadeTarihi: tarihInput(t.vadeTarihi) })));
        }
      }
      setTaksitDuzenle(false);
    } finally { setPlanKaydediliyor(false); }
  }

  function taksitCheckboxTiklandi(taksit: Taksit) {
    if (taksit.odendiMi) {
      // İşareti kaldır — tahsilat kaydını da sil
      taksitIsaretKaldir(taksit.id);
    } else {
      // Onay popup'ı aç
      setTaksitOnay({ id: taksit.id, tutar: Number(taksit.tutar), aciklama: taksit.aciklama });
      setTaksitOnayTutar(String(Number(taksit.tutar).toFixed(2)));
    }
  }

  async function taksitIsaretKaldir(taksitId: string) {
    // Taksiti ödenmedi yap
    await fetch("/api/odeme-plani", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taksitId, odendiMi: false }),
    }).then(r => r.json());
    // Bağlı tahsilat kaydını sil
    const bagli = tahsilatlar.find(t => (t as any).taksitId === taksitId);
    if (bagli) {
      await fetch(`/api/tahsilatlar?id=${bagli.id}`, { method: "DELETE" });
      setTahsilatlar(prev => prev.filter(t => t.id !== bagli.id));
    }
    setOdemePlani(prev => prev ? {
      ...prev,
      taksitler: prev.taksitler.map(t => t.id === taksitId
        ? { ...t, odendiMi: false, odenmeTarihi: undefined } : t)
    } : null);
  }

  async function taksitOnayKaydet() {
    if (!taksitOnay || !seciliMusteri || !aktifIs) return;
    setTaksitOnayYukleniyor(true);
    try {
      const tutar = parseFloat(taksitOnayTutar.replace(",", "."));
      if (!tutar || tutar <= 0) return;
      // 1. Taksiti ödendi işaretle
      const planRes = await fetch("/api/odeme-plani", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taksitId: taksitOnay.id, odendiMi: true }),
      }).then(r => r.json());
      // 2. Tahsilat kaydı oluştur
      const tahRes = await fetch("/api/tahsilatlar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musteriId: seciliMusteri.id,
          isId: aktifIs.id,
          tutar,
          tarih: new Date().toISOString(),
          taksitId: taksitOnay.id,
        }),
      }).then(r => r.json());
      if (planRes.taksit) {
        setOdemePlani(prev => prev ? {
          ...prev,
          taksitler: prev.taksitler.map(t => t.id === taksitOnay.id
            ? { ...t, odendiMi: true, odenmeTarihi: planRes.taksit.odenmeTarihi } : t)
        } : null);
      }
      if (tahRes.tahsilat) {
        setTahsilatlar(prev => [tahRes.tahsilat, ...prev]);
      }
      setTaksitOnay(null);
    } finally {
      setTaksitOnayYukleniyor(false);
    }
  }

  async function tahsilatKaydet() {
    if (!seciliMusteri || !yeniTutar) return;
    setKaydediliyor(true);
    try {
      const res = await fetch("/api/tahsilatlar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musteriId: seciliMusteri.id,
          tutar: Number(yeniTutar.replace(",", ".")),
          tarih: yeniTarih, isId: aktifIs?.id || null,
        }),
      }).then(r => r.json());
      if (res.tahsilat) {
        setTahsilatlar(prev => [res.tahsilat, ...prev]);
        setYeniTutar(""); setYeniTarih(new Date().toISOString().slice(0, 10));
      }
    } finally { setKaydediliyor(false); }
  }

  async function tahsilatSil(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/tahsilatlar?id=${id}`, { method: "DELETE" });
    setTahsilatlar(prev => prev.filter(t => t.id !== id));
  }

  const toplamBorc = isler.reduce((s, i) => s + Number(i.satisFiyati), 0);
  const toplamTahsilat = tahsilatlar.reduce((s, t) => s + Number(t.tutar), 0);
  const bakiye = toplamBorc - toplamTahsilat;
  const filtreli = musteriler.filter(m =>
    (m.ad + " " + (m.firmaAdi || "")).toLocaleLowerCase("tr-TR")
      .includes(musteriArama.toLocaleLowerCase("tr-TR"))
  );
  const gosterilecekTaksitler = taksitDuzenle ? draftTaksitler : (odemePlani?.taksitler || []);

  // ── İÇERİK PANELLERİ ────────────────────────────────────────────────────
  const PanelMusteri = (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px", height:"100%", overflowY:"auto", padding:"14px", paddingBottom:"140px" }}>
      <div className="kart">
        <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"8px", color:"#9ca3af" }}>👤 MÜŞTERİ</p>
        <div style={{ position:"relative" }}>
          <input className="yi-inp" placeholder="İsim veya firma..."
            value={seciliMusteri ? (seciliMusteri.firmaAdi || seciliMusteri.ad) : musteriArama}
            onFocus={() => setListeAcik(true)}
            onChange={e => { setMusteriArama(e.target.value); setSeciliMusteri(null); setListeAcik(true); }} />
          {listeAcik && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, marginTop:"4px", background:"#111827", border:"1px solid #374151", borderRadius:"13px", zIndex:100, maxHeight:"220px", overflowY:"auto", boxShadow:"0 16px 40px rgba(0,0,0,0.8)" }}
              onMouseLeave={() => setListeAcik(false)}>
              {filtreli.slice(0,10).map(m => (
                <button key={m.id} onClick={() => musteriSec(m)}
                  style={{ width:"100%", padding:"10px 14px", textAlign:"left", background:"transparent", border:"none", borderBottom:"1px solid #1f2937", cursor:"pointer", color:"#f9fafb" }}
                  onMouseOver={e => (e.currentTarget.style.background="#1f2937")}
                  onMouseOut={e => (e.currentTarget.style.background="transparent")}>
                  <div style={{ fontSize:"14px", fontWeight:600 }}>{m.firmaAdi||m.ad}</div>
                  <div style={{ fontSize:"11px", color:"#6b7280" }}>{MUSTERI_TIP[m.musteriTipi]} · {m.telefon}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {seciliMusteri && (
          <div style={{ marginTop:"10px" }}>
            <div style={{ fontSize:"15px", fontWeight:900, color:"#10b981" }}>{seciliMusteri.firmaAdi||seciliMusteri.ad}</div>
            <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"2px" }}>
              {MUSTERI_TIP[seciliMusteri.musteriTipi]} · {seciliMusteri.telefon || <span style={{ color:"#ef4444" }}>Telefon kayıtlı değil</span>}
            </div>
            {seciliMusteri.telefon ? (
              <button
                onClick={() => {
                  let phone = seciliMusteri.telefon!.replace(/\D/g, "")
                  if (phone.startsWith("0")) phone = "90" + phone.slice(1)
                  if (phone && !phone.startsWith("90")) phone = "90" + phone
                  const ad = seciliMusteri.firmaAdi || seciliMusteri.ad
                  const mesaj = `Merhaba ${ad}, ödeme planınız hakkında bilgi vermek için ulaşıyoruz.`
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(mesaj)}`
                  const a = document.createElement("a")
                  a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"
                  document.body.appendChild(a); a.click(); document.body.removeChild(a)
                }}
                style={{ marginTop:"10px", width:"100%", padding:"10px", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"12px", color:"#4ade80", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}
              >
                📲 WA Mesaj Gönder
              </button>
            ) : null}
            <div style={{ marginTop:"10px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px" }}>
              {[
                { l:"Borç", v:tl(toplamBorc), c:"#f87171" },
                { l:"Ödenen", v:tl(toplamTahsilat), c:"#10b981" },
                { l:"Bakiye", v:tl(Math.abs(bakiye)), c:"#fbbf24" },
              ].map(x => (
                <div key={x.l} style={{ background:"#0d1117", borderRadius:"10px", padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:"10px", color:"#6b7280" }}>{x.l}</div>
                  <div style={{ fontSize:"12px", fontWeight:900, color:x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {seciliMusteri && (
        <div className="kart">
          <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"8px", color:"#9ca3af" }}>
            ✅ İŞLER ({isler.length})
          </p>
          {yukleniyor && <p style={{ fontSize:"13px", color:"#4b5563" }}>Yükleniyor...</p>}
          {!yukleniyor && isler.length === 0 && <p style={{ fontSize:"13px", color:"#4b5563" }}>Bu müşteriye ait iş bulunamadı.</p>}
          {isler.map(is => (
            <button key={is.id}
              onClick={() => { isSec(is); setAktifSekme("plan"); }}
              className={`is-btn${aktifIs?.id===is.id?" aktif":""}`}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"13px", fontWeight:700, textTransform:"capitalize" }}>{is.urunAdi}</span>
                <span style={{ fontSize:"12px", color:"#10b981", fontWeight:700 }}>{tl(Number(is.satisFiyati))}</span>
              </div>
              <div style={{ fontSize:"11px", color:"#4b5563", marginTop:"2px" }}>#{is.teklifNo}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const PanelTahsilat = (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px", height:"100%", overflowY:"auto", padding:"14px", paddingBottom:"140px" }}>
      {!seciliMusteri ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#4b5563" }}>
          <div style={{ fontSize:"36px", marginBottom:"10px" }}>💳</div>
          <p>Önce müşteri seçin</p>
        </div>
      ) : (
        <>
          <div className="kart">
            <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"12px", color:"#9ca3af" }}>💳 TAHSİLAT GİR</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div>
                <span className="yi-label">Tutar (₺)</span>
                <input className="yi-inp" type="text" inputMode="decimal" placeholder="0,00"
                  value={yeniTutar} onChange={e => setYeniTutar(e.target.value)} />
              </div>
              <div>
                <span className="yi-label">Tarih</span>
                <input className="yi-inp" type="date" value={yeniTarih} onChange={e => setYeniTarih(e.target.value)} />
              </div>
              {aktifIs && (
                <div style={{ fontSize:"12px", color:"#10b981", background:"rgba(16,185,129,0.07)", borderRadius:"9px", padding:"8px 12px" }}>
                  ✓ {aktifIs.urunAdi}
                </div>
              )}
              <button onClick={tahsilatKaydet} disabled={kaydediliyor||!yeniTutar}
                style={{ padding:"13px", background:!yeniTutar?"#1f2937":"#10b981", border:"none", borderRadius:"12px", color:"#fff", fontSize:"14px", fontWeight:900, cursor:"pointer" }}>
                {kaydediliyor ? "..." : "✓ Tahsilat Kaydet"}
              </button>
            </div>
          </div>

          {tahsilatlar.length > 0 && (
            <div className="kart">
              <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"10px", color:"#9ca3af" }}>📊 CARİ HAREKETLER</p>
              {tahsilatlar.map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 0", borderBottom:"1px solid #0d1117" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#10b981" }}>{tl(Number(t.tutar))}</div>
                    <div style={{ fontSize:"11px", color:"#6b7280" }}>
                      {tarihFmt(t.tarih)}{t.is?` · ${t.is.urunAdi}`:" · Genel"}
                    </div>
                  </div>
                  <button onClick={() => tahsilatSil(t.id)}
                    style={{ background:"none", border:"none", color:"#4b5563", cursor:"pointer", fontSize:"18px", padding:"2px 8px" }}>×</button>
                </div>
              ))}
              <div style={{ marginTop:"12px", paddingTop:"10px", borderTop:"1px solid #1f2937" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                  <span style={{ fontSize:"12px", color:"#6b7280" }}>Toplam Tahsilat</span>
                  <span style={{ fontSize:"14px", fontWeight:900, color:"#10b981" }}>{tl(toplamTahsilat)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"12px", color:"#6b7280" }}>Kalan Bakiye</span>
                  <span style={{ fontSize:"14px", fontWeight:900, color:"#fbbf24" }}>{tl(bakiye)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const PanelPlan = (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px", height:"100%", overflowY:"auto", padding:"14px", paddingBottom:"140px" }}>
      {bugunListesi.length > 0 && !aktifIs && (
        <div className="kart" style={{ borderColor:"rgba(239,68,68,0.3)" }}>
          <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"10px", color:"#f87171" }}>🔔 BUGÜN BEKLEYENLER</p>
          {bugunListesi.map((item:any,i:number) => (
            <div key={i} style={{ padding:"10px", background:"#0d1117", borderRadius:"10px", marginBottom:"6px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:700 }}>{item.musteriAdi}</div>
                <div style={{ fontSize:"11px", color:"#6b7280" }}>{item.isAdi} · {item.aciklama}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"13px", fontWeight:900, color:"#fbbf24" }}>{tl(item.tutar)}</div>
                <div style={{ fontSize:"10px", color:"#6b7280" }}>{tarihFmt(item.vadeTarihi)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!aktifIs ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#4b5563" }}>
          <div style={{ fontSize:"36px", marginBottom:"10px" }}>📅</div>
          <p>Müşteri & iş seçin</p>
        </div>
      ) : (
        <div className="kart">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
            <div>
              <p style={{ fontSize:"14px", fontWeight:900, margin:0 }}>📅 Ödeme Planı</p>
              <p style={{ fontSize:"12px", color:"#6b7280", marginTop:"3px" }}>{aktifIs.urunAdi} · {tl(Number(aktifIs.satisFiyati))}</p>
            </div>
            <button onClick={() => setTaksitDuzenle(p => !p)}
              style={{ padding:"6px 13px", background:taksitDuzenle?"rgba(251,191,36,0.1)":"#1f2937", border:`1px solid ${taksitDuzenle?"#fbbf24":"#374151"}`, borderRadius:"9px", color:taksitDuzenle?"#fbbf24":"#9ca3af", fontSize:"12px", fontWeight:700, cursor:"pointer", flexShrink:0 }}>
              {taksitDuzenle ? "✕ İptal" : "✏️ Düzenle"}
            </button>
          </div>

          {planYukleniyor && <p style={{ color:"#6b7280", fontSize:"13px" }}>Yükleniyor...</p>}

          {taksitDuzenle && (
            <div style={{ marginBottom:"14px", padding:"12px", background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:"12px" }}>
              <p style={{ fontSize:"11px", color:"#fbbf24", fontWeight:700, marginBottom:"8px" }}>Taksit Sayısı</p>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => taksitSayisiDegistir(n)}
                    style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${draftTaksitler.length===n?"#fbbf24":"#374151"}`, background:draftTaksitler.length===n?"rgba(251,191,36,0.1)":"#111827", color:draftTaksitler.length===n?"#fbbf24":"#9ca3af", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {odemePlani && !taksitDuzenle && (() => {
            const odenen = odemePlani.taksitler.filter(t=>t.odendiMi).reduce((s,t)=>s+Number(t.tutar),0);
            const yuzde = Number(odemePlani.toplamTutar)>0?(odenen/Number(odemePlani.toplamTutar))*100:0;
            return (
              <div style={{ marginBottom:"14px" }}>
                <div style={{ height:"5px", background:"#1f2937", borderRadius:"100px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${yuzde}%`, background:"#10b981", borderRadius:"100px", transition:"width .4s" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px", fontSize:"11px", color:"#6b7280" }}>
                  <span>%{yuzde.toFixed(0)} ödendi</span>
                  <span>Kalan: {tl(Number(odemePlani.toplamTutar)-odenen)}</span>
                </div>
              </div>
            );
          })()}

          {gosterilecekTaksitler.map((taksit, idx) => {
            const gun = gunFarki(taksit.vadeTarihi);
            const gecti = gun < 0 && !taksit.odendiMi;
            const bugun = gun === 0 && !taksit.odendiMi;
            const yakin = gun > 0 && gun <= 3 && !taksit.odendiMi;

            if (taksitDuzenle) return (
              <div key={idx} style={{ padding:"13px", background:"#0d1117", borderRadius:"13px", marginBottom:"8px", border:"1px solid #1f2937" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"8px" }}>
                  <div>
                    <span className="yi-label">Açıklama</span>
                    <input className="yi-inp" value={taksit.aciklama}
                      onChange={e => draftGuncelle(idx, { aciklama: e.target.value })} />
                  </div>
                  <div>
                    <span className="yi-label">Tutar (₺)</span>
                    <input className="yi-inp" type="text" inputMode="decimal" value={taksit.tutar}
                      onChange={e => draftGuncelle(idx, { tutar: Number(e.target.value.replace(",",".")) })} />
                  </div>
                </div>
                <div>
                  <span className="yi-label">Vade Tarihi</span>
                  <input className="yi-inp" type="date" value={taksit.vadeTarihi}
                    onChange={e => draftGuncelle(idx, { vadeTarihi: e.target.value })} />
                </div>
              </div>
            );

            return (
              <div key={taksit.id||idx} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", borderRadius:"13px", border:`1px solid ${gecti?"rgba(239,68,68,0.4)":bugun?"rgba(251,191,36,0.4)":taksit.odendiMi?"rgba(16,185,129,0.25)":"#1f2937"}`, background:"#0d1117", marginBottom:"8px" }}>
                <button onClick={() => taksit.id && taksitCheckboxTiklandi(taksit)}
                  style={{ width:"28px", height:"28px", borderRadius:"8px", flexShrink:0, border:"none", cursor:"pointer", background:taksit.odendiMi?"#10b981":"#1f2937", color:"#fff", fontSize:"14px" }}>
                  {taksit.odendiMi?"✓":""}
                </button>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"13px", fontWeight:700, color:taksit.odendiMi?"#6b7280":"#f9fafb", textDecoration:taksit.odendiMi?"line-through":"none" }}>
                    {taksit.aciklama}
                  </div>
                  <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"1px" }}>
                    {tarihFmt(taksit.vadeTarihi)}
                    {taksit.odendiMi&&taksit.odenmeTarihi&&` · ${tarihFmt(taksit.odenmeTarihi)}`}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"14px", fontWeight:900 }}>{tl(Number(taksit.tutar))}</div>
                  {gecti&&<div style={{ fontSize:"10px", color:"#f87171", fontWeight:700 }}>{Math.abs(gun)}g gecikti</div>}
                  {bugun&&<div style={{ fontSize:"10px", color:"#fbbf24", fontWeight:700 }}>Bugün!</div>}
                  {yakin&&<div style={{ fontSize:"10px", color:"#fbbf24" }}>{gun}g kaldı</div>}
                  {taksit.odendiMi&&<div style={{ fontSize:"10px", color:"#10b981" }}>✓</div>}
                </div>
              </div>
            );
          })}

          {taksitDuzenle && (
            <button onClick={planKaydet} disabled={planKaydediliyor}
              style={{ width:"100%", marginTop:"8px", padding:"13px", background:"#10b981", border:"none", borderRadius:"12px", color:"#fff", fontSize:"14px", fontWeight:900, cursor:"pointer" }}>
              {planKaydediliyor ? "Kaydediliyor..." : "✓ Planı Kaydet"}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const PanelSablon = (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px", height:"100%", overflowY:"auto", padding:"14px", paddingBottom:"140px" }}>
      <div className="kart">
        <p style={{ fontSize:"12px", fontWeight:700, marginBottom:"10px", color:"#9ca3af" }}>💳 ÖDEME ŞABLONLARI</p>
        <p style={{ fontSize:"11px", color:"#4b5563", marginBottom:"12px" }}>Her müşteri tipi için 3 farklı ödeme planı tanımlayın. Teklif onayında müşteriye sunulur.</p>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"14px" }}>
          {([["bayi","Bayi"],["mimar","Mimar"],["muteahhit","Müteahhit"],["son_kullanici","Ev Sahibi"],["imalatci","İmalatçı"]] as const).map(([tip,label]) => (
            <button key={tip} onClick={() => setAktifTip(tip)}
              style={{ padding:"6px 14px", borderRadius:"10px", border:`1px solid ${aktifTip===tip?"#10b981":"#374151"}`, background:aktifTip===tip?"rgba(16,185,129,0.1)":"#111827", color:aktifTip===tip?"#10b981":"#9ca3af", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>
        {sablonYukleniyor && <p style={{ fontSize:"13px", color:"#4b5563" }}>Yükleniyor...</p>}
        {sablonlar.filter(s => s.musteriTipi === aktifTip).map((sablon, idx) => (
          <div key={sablon.id} style={{ background:"#0d1117", borderRadius:"13px", padding:"13px", marginBottom:"8px", border:"1px solid #1f2937" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
              <div>
                <span style={{ fontSize:"13px", fontWeight:900, color:"#f9fafb" }}>{sablon.ad}</span>
                <span style={{ fontSize:"11px", color:"#6b7280", marginLeft:"8px" }}>{sablon.aciklama}</span>
              </div>
              <div style={{ display:"flex", gap:"6px" }}>
                <button onClick={() => setSablonDuzenle({ ...sablon, taksitler: sablon.taksitler })}
                  style={{ padding:"4px 10px", borderRadius:"8px", border:"1px solid #374151", background:"#1f2937", color:"#9ca3af", fontSize:"11px", cursor:"pointer" }}>✏️</button>
                {!sablon.id?.startsWith("default_") && (
                  <button onClick={() => setSablonSil(sablon.id)}
                    style={{ padding:"4px 10px", borderRadius:"8px", border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#f87171", fontSize:"11px", cursor:"pointer" }}>×</button>
                )}
              </div>
            </div>
            {(sablon.taksitler as any[]).map((t: any, i: number) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#6b7280", padding:"3px 0", borderTop:"1px solid #1f2937" }}>
                <span>{t.aciklama}</span>
                <span style={{ color:"#10b981", fontWeight:700 }}>%{t.yuzde} · +{t.gunSonra}g</span>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => setSablonDuzenle({ musteriTipi: aktifTip, ad: "", aciklama: "", sira: (sablonlar.filter(s=>s.musteriTipi===aktifTip).length+1), taksitler:[{taksitNo:1,aciklama:"Peşinat",yuzde:50,gunSonra:0},{taksitNo:2,aciklama:"Teslimatta",yuzde:50,gunSonra:30}] })}
          style={{ width:"100%", padding:"11px", background:"rgba(16,185,129,0.08)", border:"1px dashed rgba(16,185,129,0.3)", borderRadius:"12px", color:"#10b981", fontSize:"13px", fontWeight:700, cursor:"pointer", marginTop:"4px" }}>
          + Yeni Şablon Ekle
        </button>
      </div>

      {/* Şablon Düzenleme Modalı */}
      {sablonDuzenle && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ background:"#0a0f1a", border:"1px solid #1f2937", borderRadius:"20px", padding:"20px", width:"100%", maxWidth:"480px", maxHeight:"90vh", overflowY:"auto" }}>
            <p style={{ fontSize:"14px", fontWeight:900, marginBottom:"14px" }}>
              {sablonDuzenle.id ? "Şablonu Düzenle" : "Yeni Şablon"}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div>
                <span className="yi-label">Şablon Adı</span>
                <input className="yi-inp" value={sablonDuzenle.ad} onChange={e => setSablonDuzenle((p:any) => ({...p, ad:e.target.value}))} placeholder="Standart, Esnek, Peşin..." />
              </div>
              <div>
                <span className="yi-label">Açıklama</span>
                <input className="yi-inp" value={sablonDuzenle.aciklama} onChange={e => setSablonDuzenle((p:any) => ({...p, aciklama:e.target.value}))} placeholder="Kısa açıklama..." />
              </div>
              <div>
                <span className="yi-label">Taksit Sayısı</span>
                <div style={{ display:"flex", gap:"6px" }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => {
                      const yeni = Array.from({length:n},(_,i)=>sablonDuzenle.taksitler[i]||{taksitNo:i+1,aciklama:`${i+1}. Taksit`,yuzde:Math.floor(100/n),gunSonra:i*30});
                      setSablonDuzenle((p:any)=>({...p,taksitler:yeni}));
                    }}
                      style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${sablonDuzenle.taksitler.length===n?"#10b981":"#374151"}`, background:sablonDuzenle.taksitler.length===n?"rgba(16,185,129,0.1)":"#111827", color:sablonDuzenle.taksitler.length===n?"#10b981":"#9ca3af", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {sablonDuzenle.taksitler.map((t:any, i:number) => (
                <div key={i} style={{ background:"#0d1117", borderRadius:"12px", padding:"12px", border:"1px solid #1f2937" }}>
                  <div style={{ fontSize:"11px", color:"#6b7280", fontWeight:700, marginBottom:"8px" }}>{i+1}. TAKSİT</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px", gap:"8px" }}>
                    <div>
                      <span className="yi-label">Açıklama</span>
                      <input className="yi-inp" value={t.aciklama} onChange={e => setSablonDuzenle((p:any)=>({...p,taksitler:p.taksitler.map((x:any,j:number)=>j===i?{...x,aciklama:e.target.value}:x)}))} />
                    </div>
                    <div>
                      <span className="yi-label">% Oran</span>
                      <input className="yi-inp" type="number" value={t.yuzde} onChange={e => setSablonDuzenle((p:any)=>({...p,taksitler:p.taksitler.map((x:any,j:number)=>j===i?{...x,yuzde:Number(e.target.value)}:x)}))} />
                    </div>
                    <div>
                      <span className="yi-label">+Gün</span>
                      <input className="yi-inp" type="number" value={t.gunSonra} onChange={e => setSablonDuzenle((p:any)=>({...p,taksitler:p.taksitler.map((x:any,j:number)=>j===i?{...x,gunSonra:Number(e.target.value)}:x)}))} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
                <button onClick={() => setSablonDuzenle(null)}
                  style={{ flex:1, padding:"12px", background:"#1f2937", border:"none", borderRadius:"12px", color:"#9ca3af", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
                  İptal
                </button>
                <button onClick={() => sablonKaydet(sablonDuzenle)}
                  style={{ flex:2, padding:"12px", background:"#10b981", border:"none", borderRadius:"12px", color:"#fff", fontSize:"13px", fontWeight:900, cursor:"pointer" }}>
                  ✓ Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {sablonSil && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ background:"#0a0f1a", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"20px", padding:"24px", maxWidth:"320px", width:"100%", textAlign:"center" }}>
            <p style={{ fontSize:"15px", fontWeight:900, marginBottom:"10px" }}>Şablonu sil?</p>
            <p style={{ fontSize:"13px", color:"#6b7280", marginBottom:"16px" }}>Bu işlem geri alınamaz.</p>
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={() => setSablonSil(null)} style={{ flex:1, padding:"11px", background:"#1f2937", border:"none", borderRadius:"11px", color:"#9ca3af", fontWeight:700, cursor:"pointer" }}>İptal</button>
              <button onClick={() => sablonSilFn(sablonSil)} style={{ flex:1, padding:"11px", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"11px", color:"#f87171", fontWeight:900, cursor:"pointer" }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
    {/* Taksit Onay Popup */}
    {taksitOnay && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
        <div style={{ background:"#0d1117", border:"1px solid #1f2937", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"360px" }}>
          <p style={{ fontSize:"11px", color:"#10b981", fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", margin:"0 0 6px" }}>Tahsilat Onayla</p>
          <h2 style={{ fontSize:"17px", fontWeight:900, margin:"0 0 4px" }}>{taksitOnay.aciklama}</h2>
          <p style={{ fontSize:"12px", color:"#6b7280", margin:"0 0 18px" }}>{aktifIs?.urunAdi}</p>
          <label style={{ fontSize:"11px", color:"#9ca3af", display:"block", marginBottom:"6px" }}>Tahsil Edilen Tutar (₺)</label>
          <input
            type="number"
            value={taksitOnayTutar}
            onChange={e => setTaksitOnayTutar(e.target.value)}
            style={{ width:"100%", background:"#111827", border:"1px solid #374151", borderRadius:"10px", padding:"10px 14px", color:"#fff", fontSize:"16px", fontWeight:900, boxSizing:"border-box", marginBottom:"16px" }}
          />
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={() => setTaksitOnay(null)}
              style={{ flex:1, padding:"12px", background:"#1f2937", border:"1px solid #374151", borderRadius:"12px", color:"#9ca3af", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>
              İptal
            </button>
            <button onClick={taksitOnayKaydet} disabled={taksitOnayYukleniyor}
              style={{ flex:2, padding:"12px", background:"#10b981", border:"none", borderRadius:"12px", color:"#fff", fontSize:"14px", fontWeight:900, cursor:"pointer" }}>
              {taksitOnayYukleniyor ? "Kaydediliyor..." : "✓ Tahsil Edildi"}
            </button>
          </div>
        </div>
      </div>
    )}
    <div style={{ height:"100dvh", background:"#030712", color:"#f9fafb", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        .kart{background:#0a0f1a;border:1px solid #1f2937;border-radius:18px;padding:16px;}
        .yi-inp{width:100%;box-sizing:border-box;background:#111827;border:1.5px solid #1f2937;border-radius:11px;padding:10px 13px;color:#f9fafb;font-size:15px;outline:none;}
        .yi-inp:focus{border-color:#10b981;}
        .yi-label{font-size:10px;color:#6b7280;margin-bottom:4px;display:block;font-weight:700;text-transform:uppercase;letter-spacing:.08em;}
        .is-btn{width:100%;text-align:left;padding:11px 13px;border-radius:12px;border:1px solid #1f2937;background:#0d1117;cursor:pointer;margin-bottom:7px;color:#f9fafb;transition:all .15s;}
        .is-btn:hover{border-color:#374151;background:#111827;}
        .is-btn.aktif{border-color:#10b981!important;background:rgba(16,185,129,0.08)!important;}
        .sekme-btn{flex:1;padding:10px 4px;background:transparent;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;color:#6b7280;font-size:10px;font-weight:700;transition:color .15s;}
        .sekme-btn.aktif{color:#10b981;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#374151;border-radius:4px;}
      `}</style>

      {/* HEADER */}
      <div style={{ flexShrink:0, borderBottom:"1px solid #1f2937", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <button onClick={() => router.push("/dashboard/isler")}
            style={{ background:"#0d1117", border:"1px solid #1f2937", borderRadius:"10px", color:"#9ca3af", padding:"7px 13px", fontSize:"13px", cursor:"pointer" }}>
            ← Geri
          </button>
          <div>
            <p style={{ fontSize:"10px", color:"#4b5563", letterSpacing:".2em", textTransform:"uppercase", margin:0 }}>Finans & Cari</p>
            <h1 style={{ fontSize:"17px", fontWeight:900, margin:0 }}>Tahsilat & Cari</h1>
          </div>
        </div>
        {bugunListesi.length > 0 && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"10px", padding:"6px 12px", fontSize:"11px", color:"#f87171", fontWeight:700 }}>
            🔔 {bugunListesi.length} bekliyor
          </div>
        )}
      </div>

      {/* MASAÜSTÜ: 3 kolon | MOBİL: tek panel + alt sekme */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Masaüstü 3 kolon */}
        <div className="desktop-cols" style={{ flex:1, display:"grid", gridTemplateColumns:"280px 260px 1fr", overflow:"hidden" }}>
          <div style={{ borderRight:"1px solid #1f2937", overflow:"hidden" }}>{PanelMusteri}</div>
          <div style={{ borderRight:"1px solid #1f2937", overflow:"hidden" }}>{PanelTahsilat}</div>
          <div style={{ overflow:"hidden" }}>{PanelPlan}</div>
          <div style={{ borderLeft:"1px solid #1f2937", overflow:"hidden" }}>{PanelSablon}</div>
        </div>

        {/* Mobil: aktif panel */}
        <div className="mobile-panel" style={{ flex:1, overflow:"hidden" }}>
          {aktifSekme === "musteri" && PanelMusteri}
          {aktifSekme === "tahsilat" && PanelTahsilat}
          {aktifSekme === "plan" && PanelPlan}
          {aktifSekme === "sablon" && PanelSablon}
        </div>

        {/* Mobil alt sekme çubuğu */}
        <div className="mobile-tabs" style={{ position:"fixed", bottom:"72px", left:0, right:0, zIndex:85, borderTop:"1px solid #1f2937", borderBottom:"1px solid #1f2937", background:"rgba(3,7,18,0.97)", backdropFilter:"blur(16px)", display:"flex", paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
          {([
            { id:"musteri" as Sekme, icon:"👤", label:"Müşteri", badge: seciliMusteri ? isler.length : 0 },
            { id:"tahsilat" as Sekme, icon:"💳", label:"Tahsilat", badge: tahsilatlar.length },
            { id:"plan" as Sekme, icon:"📅", label:"Ödeme Planı", badge: odemePlani?.taksitler.filter(t=>!t.odendiMi).length || 0 },
            { id:"sablon" as Sekme, icon:"⚙️", label:"Şablonlar", badge: 0 },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setAktifSekme(s.id)}
              className={`sekme-btn${aktifSekme===s.id?" aktif":""}`}>
              <div style={{ position:"relative" }}>
                <span style={{ fontSize:"20px" }}>{s.icon}</span>
                {s.badge > 0 && (
                  <span style={{ position:"absolute", top:"-4px", right:"-8px", background:"#ef4444", color:"#fff", borderRadius:"100px", fontSize:"9px", fontWeight:900, padding:"1px 5px", minWidth:"16px", textAlign:"center" }}>
                    {s.badge}
                  </span>
                )}
              </div>
              <span>{s.label}</span>
              {aktifSekme===s.id && <div style={{ width:"20px", height:"2px", background:"#10b981", borderRadius:"100px" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-cols { display: grid !important; }
          .mobile-panel { display: none !important; }
          .mobile-tabs  { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-cols { display: none !important; }
          .mobile-panel { display: block !important; }
          .mobile-tabs  { display: flex !important; }
        }
      `}</style>
    </div>
    </>
  );
}
