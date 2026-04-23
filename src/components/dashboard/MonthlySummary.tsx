import Card from "@/components/ui/Card";
import { paraGoster, yuzdeGoster } from "@/lib/format";

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

type Props = {
  data: MonthlySummaryData | null;
};

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "green" | "amber" | "red" | "blue" | "purple";
}) {
  const toneMap = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className={`rounded-2xl px-4 py-4 ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function MonthlySummary({ data }: Props) {
  if (!data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Bu Ay Özeti</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              Aylık görünüm hazırlanıyor
            </h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Veri yok
          </span>
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">
            Bu ay için henüz gösterilecek özet veri bulunamadı.
          </p>
        </div>
      </Card>
    );
  }

  const marj =
    data.onaylananTeklifTutari > 0
      ? (data.toplamKazanc / data.onaylananTeklifTutari) * 100
      : 0;

  const kirikOrani =
    data.toplamPlaka > 0 ? (data.kirilanTas / data.toplamPlaka) * 100 : 0;

  const yorum =
    data.onaylanmaOrani < 30
      ? "Teklif hacmi var ama onay oranı baskı altında. Bekleyen tekliflere odaklanmak en hızlı kazancı üretir."
      : data.toplamTahsilat < data.onaylananTeklifTutari * 0.5
      ? "Onaylanan işler iyi gidiyor; fakat tahsilat tarafı hızlanmazsa nakit akışı baskılanır."
      : "Aylık görünüm dengeli. Şimdi odak alanı marjı koruyarak hacmi artırmak olmalı.";

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Bu Ay Özeti</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {data.ayAdi} {data.yil} performans görünümü
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Bu alan ay bazında teklif hacmini, dönüşümü, maliyeti, tahsilatı ve kazancı tek blokta görmeni sağlar.
          </p>
        </div>

        <span className="w-fit rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200">
          Güncel ay özeti
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MiniMetric label="Toplam Teklif" value={String(data.toplamTeklif)} tone="slate" />
        <MiniMetric label="Onaylanan" value={String(data.onaylananTeklif)} tone="green" />
        <MiniMetric label="Bekleyen" value={String(data.bekleyenTeklif)} tone="amber" />
        <MiniMetric label="Kaybedilen" value={String(data.kaybedilenTeklif)} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Finans Özeti</p>
              <h4 className="mt-1 text-xl font-bold text-slate-900">Aylık rakamsal görünüm</h4>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
              {yuzdeGoster(data.onaylanmaOrani)} onay
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Toplam Teklif Tutarı</span>
                <span className="font-semibold text-slate-900">
                  {paraGoster(data.toplamTeklifTutari)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white">
                <div className="h-3 w-full rounded-full bg-blue-600" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Onaylanan Tutar</span>
                <span className="font-semibold text-emerald-700">
                  {paraGoster(data.onaylananTeklifTutari)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{
                    width:
                      data.toplamTeklifTutari > 0
                        ? `${(data.onaylananTeklifTutari / data.toplamTeklifTutari) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Toplam Maliyet</span>
                <span className="font-semibold text-rose-600">
                  {paraGoster(data.toplamMaliyet)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-rose-500"
                  style={{
                    width:
                      data.onaylananTeklifTutari > 0
                        ? `${Math.min(
                            (data.toplamMaliyet / data.onaylananTeklifTutari) * 100,
                            100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Toplam Kazanç</span>
                <span className="font-semibold text-violet-700">
                  {paraGoster(data.toplamKazanc)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-violet-600"
                  style={{
                    width:
                      data.onaylananTeklifTutari > 0
                        ? `${Math.min(
                            (data.toplamKazanc / data.onaylananTeklifTutari) * 100,
                            100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniMetric
              label="Toplam Tahsilat"
              value={paraGoster(data.toplamTahsilat)}
              tone="blue"
            />
            <MiniMetric
              label="Kar Marjı"
              value={yuzdeGoster(marj)}
              tone="purple"
            />
            <MiniMetric
              label="Kırılan Taş"
              value={data.kirilanTas.toLocaleString("tr-TR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              tone="red"
            />
            <MiniMetric
              label="Kırık Oranı"
              value={yuzdeGoster(kirikOrani)}
              tone="amber"
            />
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-violet-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Yönetici Yorumu
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-100">
              {yorum}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
