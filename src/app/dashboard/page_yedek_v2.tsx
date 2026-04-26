"use client";

import { useEffect, useState } from "react";
import { paraGoster } from "@/lib/format";

type DashboardData = {
  toplamIs: number;
  onaylananIs: number;
  kaybedilenIs: number;
  teklifVerilenTutar: number;
  onaylananTutar: number;
  onaylanmaOrani: number;
  toplamCiro: number;
  toplamMaliyet: number;
  toplamKar: number;
  toplamTahsilat: number;
  bekleyenIs: number;
};

type MonthlySummaryData = {
  yil: number;
  ay: number;
  ayAdi: string;
  toplamTeklif: number;
  onaylananTeklif: number;
  bekleyenTeklif: number;
  kaybedilenTeklif: number;
  onaylanmaOrani: number;
  toplamTeklifTutari: number;
  onaylananTeklifTutari: number;
  kaybedilenTeklifTutari: number;
  toplamTahsilat: number;
  kirilanTas: number;
  toplamPlaka: number;
  toplamMaliyet: number;
  toplamKazanc: number;
};

type AylikResponse = {
  aylar: MonthlySummaryData[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const dummyData: DashboardData = {
    toplamIs: 17,
    onaylananIs: 5,
    kaybedilenIs: 2,
    bekleyenIs: 10,
    teklifVerilenTutar: 2231210.30,
    onaylananTutar: 631877.75,
    onaylanmaOrani: 29.4,
    toplamCiro: 631877.75,
    toplamMaliyet: 326854.10,
    toplamKar: 305023.66,
    toplamTahsilat: 517000.00
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((res) => { if (!res.ok) throw new Error("API Hatası"); return res.json(); }),
      fetch("/api/dashboard/aylik").then((res) => { if (!res.ok) throw new Error("API Hatası"); return res.json(); })
    ])
      .then(([dashboardRes, aylikRes]: [DashboardData, AylikResponse]) => {
        setData(dashboardRes);
        setMonthly(aylikRes?.aylar?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => {
        setData(dummyData);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A] text-slate-300">
        <div className="text-xl font-light tracking-widest animate-pulse">METRİX YÜKLENİYOR...</div>
      </div>
    );
  }

  if (!data) return null;

  const karMarji = data.toplamCiro > 0 ? ((data.toplamKar / data.toplamCiro) * 100).toFixed(1) : "0.0";

  return (
    <div className="h-screen w-full bg-[#0B1120] text-slate-200 overflow-hidden font-sans flex flex-col p-6 box-border">
      
      <header className="flex justify-between items-end mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white">Yönetim <span className="font-semibold text-[#D4AF37]">Paneli</span></h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-wider">Metrix Atölye Optimizasyon Sistemi</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-medium text-white">{paraGoster(data.toplamTahsilat)}</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Aylık Tahsilat</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-[#151E32] rounded-xl p-5 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-xs text-slate-400 uppercase mb-2 tracking-wider">Toplam Teklif Hacmi</h3>
             <p className="text-2xl font-semibold text-white">{paraGoster(data.teklifVerilenTutar)}</p>
             <p className="text-xs text-slate-500 mt-2">{data.toplamIs} Aktif Teklif</p>
          </div>
          
          <div className="bg-[#151E32] rounded-xl p-5 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-xs text-slate-400 uppercase mb-2 tracking-wider">Onaylanan Tutar</h3>
             <p className="text-2xl font-semibold text-[#10B981]">{paraGoster(data.onaylananTutar)}</p>
             <p className="text-xs text-slate-500 mt-2">% {data.onaylanmaOrani} Dönüşüm Oranı</p>
          </div>

          <div className="bg-[#151E32] rounded-xl p-5 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-xs text-slate-400 uppercase mb-2 tracking-wider">Net Kâr</h3>
             <p className="text-2xl font-semibold text-[#D4AF37]">{paraGoster(data.toplamKar)}</p>
             <p className="text-xs text-slate-500 mt-2">% {karMarji} Kâr Marjı</p>
          </div>
        </div>

        <div className="col-span-6 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-6 border border-slate-700 flex flex-col h-2/5 justify-between">
            <h2 className="text-sm uppercase tracking-widest text-slate-300 mb-4">İş Akışı (Pipeline)</h2>
            <div className="flex justify-between items-center px-4">
               <div className="text-center">
                 <p className="text-4xl font-light text-white">{data.toplamIs}</p>
                 <p className="text-xs text-slate-400 mt-1 uppercase">Tümü</p>
               </div>
               <div className="h-px bg-slate-700 flex-1 mx-4"></div>
               <div className="text-center">
                 <p className="text-4xl font-light text-[#F59E0B]">{data.bekleyenIs}</p>
                 <p className="text-xs text-slate-400 mt-1 uppercase">Bekleyen</p>
               </div>
               <div className="h-px bg-slate-700 flex-1 mx-4"></div>
               <div className="text-center">
                 <p className="text-4xl font-light text-[#10B981]">{data.onaylananIs}</p>
                 <p className="text-xs text-slate-400 mt-1 uppercase">Onaylanan</p>
               </div>
            </div>
          </div>

          <div className="bg-[#151E32] rounded-2xl p-6 border border-slate-700 flex-1 flex flex-col justify-center">
             <h2 className="text-sm uppercase tracking-widest text-slate-300 mb-6">Finansal Performans</h2>
             
             <div className="mb-6">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-400">Toplam Ciro</span>
                 <span className="font-medium text-white">{paraGoster(data.toplamCiro)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-2">
                 <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
               </div>
             </div>

             <div className="mb-6">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-400">Toplam Maliyet</span>
                 <span className="font-medium text-rose-400">{paraGoster(data.toplamMaliyet)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-2">
                 <div className="bg-rose-500 h-2 rounded-full" style={{ width: data.toplamCiro ? `${(data.toplamMaliyet / data.toplamCiro) * 100}%` : '0%' }}></div>
               </div>
             </div>

             <div>
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-400">Net Kâr</span>
                 <span className="font-medium text-[#D4AF37]">{paraGoster(data.toplamKar)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-2">
                 <div className="bg-[#D4AF37] h-2 rounded-full" style={{ width: data.toplamCiro ? `${(data.toplamKar / data.toplamCiro) * 100}%` : '0%' }}></div>
               </div>
             </div>
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-6">
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#D4AF37]/30 h-1/3">
             <h2 className="text-xs uppercase tracking-widest text-[#D4AF37] mb-3">Sistem Önerisi</h2>
             <div className="text-sm text-slate-300 leading-relaxed">
               Şu anda <strong className="text-white">{data.bekleyenIs} adet teklif</strong> müşteri onayı bekliyor. Tahsilat ritmini korumak için en yüksek tutarlı tekliflere odaklanarak bugün dönüş yapılması tavsiye edilir.
             </div>
          </div>

          <div className="bg-[#151E32] rounded-xl p-5 border border-slate-700/50 flex-1 overflow-hidden flex flex-col">
             <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Güncel Aktiviteler</h2>
             <div className="flex flex-col gap-3 overflow-y-auto pr-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Çınar Mermer</p>
                    <p className="text-xs text-slate-500">Laminam Tortora</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">Bekliyor</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Selçuk Bayar</p>
                    <p className="text-xs text-slate-500">Michelangelo</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-[#10B981]/10 text-[#10B981] rounded border border-[#10B981]/20">Onaylandı</span>
                </div>

                <div className="flex justify-between items-center pb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Kazım Usta</p>
                    <p className="text-xs text-slate-500">Diamond Cream</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20">Kaybedildi</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
