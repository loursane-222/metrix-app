"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  atolyeAdi: string; sehir: string; ilce: string; telefon: string; email: string;
  toplamMaas: string; sgkGideri: string; yemekGideri: string; yolGideri: string;
  kira: string; elektrik: string; su: string; dogalgaz: string; internet: string; sarfMalzeme: string;
  aylikPorselenPlaka: string; aylikKuvarsPlaka: string; aylikDogaltasPlaka: string;
  plakaBasinaMtul: string; kdvOrani: string; teklifGecerlilik: string;
};

const BOS: FormData = {
  atolyeAdi: "", sehir: "", ilce: "", telefon: "", email: "",
  toplamMaas: "", sgkGideri: "", yemekGideri: "", yolGideri: "",
  kira: "", elektrik: "", su: "", dogalgaz: "", internet: "", sarfMalzeme: "",
  aylikPorselenPlaka: "", aylikKuvarsPlaka: "", aylikDogaltasPlaka: "",
  plakaBasinaMtul: "3.20", kdvOrani: "20", teklifGecerlilik: "15",
};

function Alan({ label, name, value, onChange, placeholder = "", tip = "text", zorunlu = false }: {
  label: string; name: keyof FormData; value: string;
  onChange: (k: keyof FormData, v: string) => void;
  placeholder?: string; tip?: string; zorunlu?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label} {zorunlu && <span className="text-blue-400">*</span>}
      </label>
      <input type={tip} value={value} onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
    </div>
  );
}

function ParaAlan({ label, name, value, onChange }: {
  label: string; name: keyof FormData; value: string;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input type="number" value={value} onChange={(e) => onChange(name, e.target.value)}
          placeholder="0" min="0"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">₺</span>
      </div>
    </div>
  );
}

function Adim1({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-white">Atölye Bilgileri</h2>
        <p className="text-sm text-slate-400 mt-1">Atölyenizi tanımlayalım.</p>
      </div>
      <Alan label="Atölye Adı" name="atolyeAdi" value={form.atolyeAdi} onChange={set} placeholder="Örn: Yıldız Granit" zorunlu />
      <div className="grid grid-cols-2 gap-3">
        <Alan label="Şehir" name="sehir" value={form.sehir} onChange={set} placeholder="İstanbul" />
        <Alan label="İlçe" name="ilce" value={form.ilce} onChange={set} placeholder="Kadıköy" />
      </div>
      <Alan label="Telefon" name="telefon" value={form.telefon} onChange={set} placeholder="0532 000 00 00" tip="tel" />
      <Alan label="E-posta" name="email" value={form.email} onChange={set} placeholder="info@atolye.com" tip="email" />
    </div>
  );
}

function Adim2({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-white">Aylık Giderler</h2>
        <p className="text-sm text-slate-400 mt-1">Maliyet hesabı için giderlerinizi girin. Sonradan değiştirebilirsiniz.</p>
      </div>
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Personel</p>
      <div className="grid grid-cols-2 gap-3">
        <ParaAlan label="Toplam Maaş" name="toplamMaas" value={form.toplamMaas} onChange={set} />
        <ParaAlan label="SGK Gideri" name="sgkGideri" value={form.sgkGideri} onChange={set} />
        <ParaAlan label="Yemek" name="yemekGideri" value={form.yemekGideri} onChange={set} />
        <ParaAlan label="Yol" name="yolGideri" value={form.yolGideri} onChange={set} />
      </div>
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mt-1">Sabit Giderler</p>
      <div className="grid grid-cols-2 gap-3">
        <ParaAlan label="Kira" name="kira" value={form.kira} onChange={set} />
        <ParaAlan label="Elektrik" name="elektrik" value={form.elektrik} onChange={set} />
        <ParaAlan label="Su" name="su" value={form.su} onChange={set} />
        <ParaAlan label="Doğalgaz" name="dogalgaz" value={form.dogalgaz} onChange={set} />
        <ParaAlan label="İnternet" name="internet" value={form.internet} onChange={set} />
        <ParaAlan label="Sarf Malzeme" name="sarfMalzeme" value={form.sarfMalzeme} onChange={set} />
      </div>
    </div>
  );
}

function Adim3({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-white">Üretim & Fiyatlandırma</h2>
        <p className="text-sm text-slate-400 mt-1">Aylık plaka kullanımı ve teklif ayarları.</p>
      </div>
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Aylık Plaka Kullanımı</p>
      <div className="grid grid-cols-3 gap-3">
        {([["aylikPorselenPlaka","Porselen"],["aylikKuvarsPlaka","Kuvarsite"],["aylikDogaltasPlaka","Doğal Taş"]] as const).map(([k,l]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{l}</label>
            <input type="number" min="0" value={form[k]} onChange={(e) => set(k, e.target.value)}
              placeholder="0"
              className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-center" />
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mt-1">Teklif Ayarları</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Plaka m²</label>
          <div className="relative">
            <input type="number" min="0" step="0.01" value={form.plakaBasinaMtul}
              onChange={(e) => set("plakaBasinaMtul", e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">m²</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">KDV</label>
          <div className="relative">
            <input type="number" min="0" max="100" value={form.kdvOrani}
              onChange={(e) => set("kdvOrani", e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Geçerlilik</label>
          <div className="relative">
            <input type="number" min="1" value={form.teklifGecerlilik}
              onChange={(e) => set("teklifGecerlilik", e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">gün</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Adim4({ atolyeAdi }: { atolyeAdi: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 py-6">
      <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
        <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">Kurulum Tamamlandı!</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
          <span className="text-blue-400 font-semibold">{atolyeAdi || "Atölye"}</span> başarıyla oluşturuldu.
          Artık iş takibi, teklif ve maliyet hesabı yapabilirsiniz.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[["📋","İş oluştur ve teklif gönder"],["👥","Müşteri kartları ve ciro takibi"],["📊","Dashboard ile anlık durum"]].map(([ic,tx]) => (
          <div key={tx} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3 text-left">
            <span className="text-lg">{ic}</span>
            <span className="text-sm text-slate-300">{tx}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADIMLAR = ["Atölye","Giderler","Üretim","Hazır"];

export default function OnboardingPage() {
  const router = useRouter();
  const [adim, setAdim] = useState(1);
  const [form, setForm] = useState<FormData>(BOS);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  function set(k: keyof FormData, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function ileri() {
    if (adim === 1 && !form.atolyeAdi.trim()) { setHata("Atölye adı zorunludur."); return; }
    setHata(""); setAdim((a) => Math.min(a + 1, 4));
  }

  function geri() { setHata(""); setAdim((a) => Math.max(a - 1, 1)); }

  async function kaydet() {
    setYukleniyor(true); setHata("");
    try {
      const res = await fetch("/api/atolye", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          atolyeAdi: form.atolyeAdi, sehir: form.sehir, ilce: form.ilce,
          telefon: form.telefon, email: form.email,
          toplamMaas: Number(form.toplamMaas)||0, sgkGideri: Number(form.sgkGideri)||0,
          yemekGideri: Number(form.yemekGideri)||0, yolGideri: Number(form.yolGideri)||0,
          kira: Number(form.kira)||0, elektrik: Number(form.elektrik)||0,
          su: Number(form.su)||0, dogalgaz: Number(form.dogalgaz)||0,
          internet: Number(form.internet)||0, sarfMalzeme: Number(form.sarfMalzeme)||0,
          aylikPorselenPlaka: Number(form.aylikPorselenPlaka)||0,
          aylikKuvarsPlaka: Number(form.aylikKuvarsPlaka)||0,
          aylikDogaltasPlaka: Number(form.aylikDogaltasPlaka)||0,
          plakaBasinaMtul: Number(form.plakaBasinaMtul)||3.20,
          kdvOrani: Number(form.kdvOrani)||20,
          teklifGecerlilik: Number(form.teklifGecerlilik)||15,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.hata || "Kayıt başarısız."); }
      setAdim(4);
    } catch (e: any) {
      setHata(e.message || "Bir hata oluştu.");
    } finally { setYukleniyor(false); }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0B1120] flex flex-col items-center justify-start px-4 py-8">
      <div className="mb-8 text-center">
        <div className="text-2xl font-bold text-white tracking-tight">
          <span className="text-blue-400">M</span>etrix
        </div>
        <p className="text-xs text-slate-500 mt-1">Atölye Kurulum Sihirbazı</p>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-slate-800">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((adim-1)/3)*100}%` }} />
        </div>

        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          {ADIMLAR.map((baslik, i) => {
            const no = i + 1; const aktif = no === adim; const bitti = no < adim;
            return (
              <div key={no} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${bitti ? "bg-blue-500 text-white" : aktif ? "bg-blue-500/20 border border-blue-500 text-blue-400" : "bg-slate-800 text-slate-600"}`}>
                  {bitti ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : no}
                </div>
                <span className={`text-[10px] font-medium ${aktif ? "text-blue-400" : bitti ? "text-slate-400" : "text-slate-600"}`}>{baslik}</span>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-5">
          {adim === 1 && <Adim1 form={form} set={set} />}
          {adim === 2 && <Adim2 form={form} set={set} />}
          {adim === 3 && <Adim3 form={form} set={set} />}
          {adim === 4 && <Adim4 atolyeAdi={form.atolyeAdi} />}
          {hata && <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{hata}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {adim > 1 && adim < 4 && (
            <button onClick={geri} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">← Geri</button>
          )}
          {adim < 3 && (
            <button onClick={ileri} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors">Devam →</button>
          )}
          {adim === 3 && (
            <button onClick={kaydet} disabled={yukleniyor} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50">
              {yukleniyor ? "Kaydediliyor..." : "Kurulumu Tamamla ✓"}
            </button>
          )}
          {adim === 4 && (
            <button onClick={() => router.push("/dashboard")} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors">Dashboard'a Git →</button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600 text-center">Tüm bilgileri daha sonra Atölye Ayarları'ndan değiştirebilirsiniz.</p>
    </div>
  );
}
