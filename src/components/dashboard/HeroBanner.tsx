import Card from "@/components/ui/Card";
import { paraGoster } from "@/lib/format";

type HeroBannerProps = {
  onaylananTutar: number;
  toplamKar: number;
  onaylanmaOrani: number;
  toplamTahsilat: number;
  bekleyenIs: number;
  onaylananIs: number;
};

function yuzdeGoster(value: number) {
  return `%${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

export default function HeroBanner({
  onaylananTutar,
  toplamKar,
  onaylanmaOrani,
  toplamTahsilat,
  bekleyenIs,
  onaylananIs,
}: HeroBannerProps) {
  const tahsilatOdagiGerekli = toplamTahsilat < onaylananTutar;

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              Premium Genel Bakış
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
              Atölyenin satış, kârlılık ve operasyon gücünü tek ekranda yönet.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Bu panel teklif hacmini, onay performansını, tahsilat baskısını ve operasyon akışını
              aynı anda gösterir. Yani sadece veri değil, yönetim hissi verir.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                {bekleyenIs} teklif takip bekliyor
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                {onaylananIs} iş onaylandı
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
                {tahsilatOdagiGerekli ? "Tahsilat odağı gerekli" : "Tahsilat dengesi iyi"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Onaylanan Tutar</p>
              <p className="mt-3 text-2xl font-bold">{paraGoster(onaylananTutar)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Toplam Kar</p>
              <p className="mt-3 text-2xl font-bold">{paraGoster(toplamKar)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Onay Oranı</p>
              <p className="mt-3 text-2xl font-bold">{yuzdeGoster(onaylanmaOrani)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Tahsilat</p>
              <p className="mt-3 text-2xl font-bold">{paraGoster(toplamTahsilat)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
