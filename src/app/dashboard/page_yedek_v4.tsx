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
      <div className="flex items-center justify-center h-screen bg-[#0B1120] text-slate-300">
        <div className="text-xl font-light tracking-widest animate-pulse">METRİX YÜKLENİYOR...</div>
      </div>
    );
  }

  if (!data) return null;

  const karMarji = data.toplamCiro > 0 ? ((data.toplamKar / data.toplamCiro) * 100).toFixed(1) : "0.0";

  return (
    <div className="h-screen w-full bg-[#0B1120] text-slate-200 overflow-hidden font-sans flex flex-col p-4 box-border">
      
      {/* ANA İÇERİK GRID YAPISI: Üst boşluk kaldırıldı, 3 Sütunlu Tam Ekran Düzen */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* SOL SÜTUN: Finansal Metrikler */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="bg-[#151E32] rounded-xl p-4 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-[10px] text-slate-400 uppercase mb-1 tracking-wider">Aylık Tahsilat</h3>
             <p className="text-xl font-semibold text-white">{paraGoster(data.toplamTahsilat)}</p>
             <div className="h-px bg-slate-800 my-2"></div>
             <h3 className="text-[10px] text-slate-400 uppercase mb-1 tracking-wider">Toplam Teklif Hacmi</h3>
             <p className="text-xl font-semibold text-white">{paraGoster(data.teklifVerilenTutar)}</p>
             <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">{data.toplamIs} Aktif Teklif</p>
          </div>
          
          <div className="bg-[#151E32] rounded-xl p-4 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-[10px] text-slate-400 uppercase mb-1 tracking-wider">Onaylanan Tutar</h3>
             <p className="text-2xl font-semibold text-[#10B981]">{paraGoster(data.onaylananTutar)}</p>
             <p className="text-[10px] text-slate-500 mt-1">% {data.onaylanmaOrani} Dönüşüm Oranı</p>
          </div>

          <div className="bg-[#151E32] rounded-xl p-4 border border-slate-700/50 flex-1 flex flex-col justify-center">
             <h3 className="text-[10px] text-slate-400 uppercase mb-1 tracking-wider">Net Kâr</h3>
             <p className="text-2xl font-semibold text-[#D4AF37]">{paraGoster(data.toplamKar)}</p>
             <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">% {karMarji} Kâr Marjı</p>
          </div>
        </div>

        {/* ORTA SÜTUN: İş Akışı ve Performans */}
        <div className="col-span-6 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-5 border border-slate-700 flex flex-col h-[35%] justify-center">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-400 mb-6 text-center">İş Akışı Optimizasyonu</h2>
            <div className="flex justify-between items-center px-4">
               <div className="text-center">
                 <p className="text-4xl font-light text-white">{data.toplamIs}</p>
                 <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Toplam</p>
               </div>
               <div className="h-px bg-slate-700 flex-1 mx-6"></div>
               <div className="text-center">
                 <p className="text-4xl font-light text-[#F59E0B]">{data.bekleyenIs}</p>
                 <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Bekleyen</p>
               </div>
               <div className="h-px bg-slate-700 flex-1 mx-6"></div>
               <div className="text-center">
                 <p className="text-4xl font-light text-[#10B981]">{data.onaylananIs}</p>
                 <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Onay</p>
               </div>
            </div>
          </div>

          <div className="bg-[#151E32] rounded-2xl p-6 border border-slate-700 flex-1 flex flex-col justify-center">
             <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-6">Maliyet & Kar Analizi</h2>
             
             <div className="mb-6">
               <div className="flex justify-between text-xs mb-2">
                 <span className="text-slate-500 uppercase">Ciro</span>
                 <span className="font-medium text-white">{paraGoster(data.toplamCiro)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-1.5">
                 <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
               </div>
             </div>

             <div className="mb-6">
               <div className="flex justify-between text-xs mb-2">
                 <span className="text-slate-500 uppercase">Maliyet</span>
                 <span className="font-medium text-rose-400">{paraGoster(data.toplamMaliyet)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-1.5">
                 <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: data.toplamCiro ? `${(data.toplamMaliyet / data.toplamCiro) * 100}%` : '0%' }}></div>
               </div>
             </div>

             <div>
               <div className="flex justify-between text-xs mb-2">
                 <span className="text-slate-500 uppercase tracking-widest text-[#D4AF37]">Net Kazanç</span>
                 <span className="font-medium text-[#D4AF37]">{paraGoster(data.toplamKar)}</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-1.5">
                 <div className="bg-[#D4AF37] h-1.5 rounded-full" style={{ width: data.toplamCiro ? `${(data.toplamKar / data.toplamCiro) * 100}%` : '0%' }}></div>
               </div>
             </div>
          </div>
        </div>

        {/* SAĞ SÜTUN: Akıllı Öneriler ve Aktiviteler */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#D4AF37]/30 h-[30%] flex flex-col justify-center">
             <h2 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-3 font-semibold">Stratejik Odak</h2>
             <div className="text-xs text-slate-300 leading-relaxed font-light">
               Sistemde <strong className="text-white">{data.bekleyenIs} adet aktif teklif</strong> tespit edildi. Karlılığı artırmak için bekleyen işlerin %20'sini bugün onay aşamasına taşımanız önerilir.
             </div>
          </div>

          <div className="bg-[#151E32] rounded-xl p-5 border border-slate-700/50 flex-1 overflow-hidden flex flex-col">
             <h2 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 tracking-widest">Son İşlemler</h2>
             <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { name: "Çınar Mermer", mat: "Laminam Tortora", status: "Bekliyor", color: "amber" },
                  { name: "Selçuk Bayar", mat: "Michelangelo", status: "Onaylandı", color: "[#10B981]" },
                  { name: "Kazım Usta", mat: "Diamond Cream", status: "Kaybedildi", color: "rose" }
                ].map((job, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <div>
                      <p className="text-xs font-medium text-white">{job.name}</p>
                      <p className="text-[10px] text-slate-500 font-light">{job.mat}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 bg-${job.color}-500/10 text-${job.color}-500 rounded border border-${job.color}-500/20 uppercase tracking-tighter`}>
                      {job.status}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
