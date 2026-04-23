import Card from "@/components/ui/Card";
import { paraGoster, yuzdeGoster } from "@/lib/format";

type Props = {
  toplamCiro: number;
  toplamMaliyet: number;
  toplamKar: number;
};

export default function ProfitCard({
  toplamCiro,
  toplamMaliyet,
  toplamKar,
}: Props) {
  const maliyetOrani =
    toplamCiro > 0 ? Math.min((toplamMaliyet / toplamCiro) * 100, 100) : 0;
  const karOrani =
    toplamCiro > 0 ? Math.min((toplamKar / toplamCiro) * 100, 100) : 0;
  const marj = toplamCiro > 0 ? (toplamKar / toplamCiro) * 100 : 0;

  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-slate-500">Kârlılık Özeti</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900">
        Finans performansı canlı
      </h3>

      <div className="mt-6 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Toplam Ciro</span>
            <span className="font-semibold text-slate-900">
              {paraGoster(toplamCiro)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-3 w-full rounded-full bg-blue-600" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Toplam Maliyet</span>
            <span className="font-semibold text-rose-600">
              {paraGoster(toplamMaliyet)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-rose-500"
              style={{ width: `${maliyetOrani}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Toplam Kar</span>
            <span className="font-semibold text-violet-700">
              {paraGoster(toplamKar)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-violet-600"
              style={{ width: `${karOrani}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
          Marj
        </p>
        <p className="mt-2 text-sm font-medium text-violet-900">
          Gerçekleşen kar marjı {yuzdeGoster(marj)} seviyesinde.
        </p>
      </div>
    </Card>
  );
}
