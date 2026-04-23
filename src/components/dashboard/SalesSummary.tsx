import Card from "@/components/ui/Card";
import { yuzdeGoster } from "@/lib/format";

type Props = {
  toplam: number;
  onay: number;
  kayip: number;
};

export default function SalesSummary({ toplam, onay, kayip }: Props) {
  const bekleyen = toplam - onay - kayip;
  const oran = toplam > 0 ? (onay / toplam) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Satış Performansı</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            Teklif → Onay → Kayıp
          </h3>
        </div>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full">
          Güncel
        </span>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-4 gap-4 mt-6 text-center">
        <div>
          <p className="text-3xl font-bold text-slate-900">{toplam}</p>
          <p className="text-xs text-slate-500 mt-1">Toplam</p>
        </div>

        <div>
          <p className="text-3xl font-bold text-emerald-600">{onay}</p>
          <p className="text-xs text-slate-500 mt-1">Onay</p>
        </div>

        <div>
          <p className="text-3xl font-bold text-amber-500">{bekleyen}</p>
          <p className="text-xs text-slate-500 mt-1">Bekleyen</p>
        </div>

        <div>
          <p className="text-3xl font-bold text-rose-600">{kayip}</p>
          <p className="text-xs text-slate-500 mt-1">Kayıp</p>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="mt-6">
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-500"
            style={{ width: `${oran}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Performans</span>
          <span>{yuzdeGoster(oran)}</span>
        </div>
      </div>

      {/* INSIGHT */}
      <div className="mt-6 rounded-2xl bg-blue-50 p-4">
        <p className="text-xs text-blue-600 font-semibold uppercase">
          Yorum
        </p>
        <p className="text-sm text-blue-900 mt-1">
          Teklif hacmi güçlü görünüyor. Onay oranını artırmak için bekleyen tekliflere odaklanmalısın.
        </p>
      </div>
    </Card>
  );
}
