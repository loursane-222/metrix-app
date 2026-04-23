import Card from "@/components/ui/Card";
import { yuzdeGoster } from "@/lib/format";

type Props = {
  toplamIs: number;
  onaylananIs: number;
  kaybedilenIs: number;
};

export default function PipelineCard({
  toplamIs,
  onaylananIs,
  kaybedilenIs,
}: Props) {
  const bekleyenIs = Math.max(toplamIs - onaylananIs - kaybedilenIs, 0);
  const onayOrani = toplamIs > 0 ? (onaylananIs / toplamIs) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Satış Akışı</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Teklif → Onay → Kayıp
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Canlı veri
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-slate-50 p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{toplamIs}</p>
          <p className="mt-2 text-sm text-slate-500">Toplam Teklif</p>
        </div>

        <div className="rounded-3xl bg-emerald-50 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700">{onaylananIs}</p>
          <p className="mt-2 text-sm text-emerald-700/70">Onaylanan</p>
        </div>

        <div className="rounded-3xl bg-rose-50 p-4 text-center">
          <p className="text-3xl font-bold text-rose-700">{kaybedilenIs}</p>
          <p className="mt-2 text-sm text-rose-700/70">Kaybedilen</p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-center">
        <p className="text-3xl font-bold text-amber-700">{bekleyenIs}</p>
        <p className="mt-2 text-sm text-amber-700/80">Bekleyen Teklif</p>
      </div>

      <div className="mt-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-500"
            style={{ width: `${Math.max(0, Math.min(onayOrani, 100))}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Onay performansı</span>
          <span>{yuzdeGoster(onayOrani)}</span>
        </div>
      </div>
    </Card>
  );
}
