import Card from "@/components/ui/Card";
import { paraGoster, yuzdeGoster } from "@/lib/format";

type Props = {
  toplamIs: number;
  onaylananIs: number;
  kaybedilenIs: number;
  onaylanmaOrani: number;
  toplamCiro: number;
  toplamTahsilat: number;
  toplamKar: number;
};

export default function SmartActions({
  toplamIs,
  onaylananIs,
  kaybedilenIs,
  onaylanmaOrani,
  toplamCiro,
  toplamTahsilat,
  toplamKar,
}: Props) {
  const bekleyenIs = Math.max(toplamIs - onaylananIs - kaybedilenIs, 0);
  const tahsilatOrani =
    toplamCiro > 0 ? (toplamTahsilat / toplamCiro) * 100 : 0;
  const karMarji = toplamCiro > 0 ? (toplamKar / toplamCiro) * 100 : 0;

  const items = [
    {
      title:
        bekleyenIs > 0
          ? `${bekleyenIs} teklif bekliyor`
          : "Bekleyen teklif baskısı yok",
      text:
        bekleyenIs > 0
          ? "En yüksek tutarlı bekleyen teklifleri bugün önceliklendir."
          : "Yeni teklif üretimine ve hacim artışına odaklan.",
      tone: "amber",
    },
    {
      title:
        onaylanmaOrani < 30
          ? `Onay oranı düşük: ${yuzdeGoster(onaylanmaOrani)}`
          : `Onay oranı dengeli: ${yuzdeGoster(onaylanmaOrani)}`,
      text:
        onaylanmaOrani < 30
          ? "Fiyatlandırma, teklif sunumu ve takip hızını gözden geçir."
          : "Mevcut dönüşüm korunurken teklif hacmi artırılabilir.",
      tone: "blue",
    },
    {
      title:
        tahsilatOrani < 50
          ? `Tahsilat baskısı var: ${yuzdeGoster(tahsilatOrani)}`
          : `Tahsilat performansı iyi: ${yuzdeGoster(tahsilatOrani)}`,
      text:
        tahsilatOrani < 50
          ? `Onaylanan ciroya karşı tahsilat ${paraGoster(
              toplamTahsilat
            )} seviyesinde. Öncelikli tahsilat listesi çıkar.`
          : "Nakit akışı sağlıklı görünüyor; ritmi koru.",
      tone: "rose",
    },
    {
      title:
        karMarji < 20
          ? `Kar marjı baskıda: ${yuzdeGoster(karMarji)}`
          : `Kar marjı iyi: ${yuzdeGoster(karMarji)}`,
      text:
        karMarji < 20
          ? "Maliyet yükseliyor olabilir. İşçilik ve plaka kullanımını kontrol et."
          : "Marj seviyesi ürün için güven veriyor; ölçeklenebilir yapı oluşuyor.",
      tone: "green",
    },
  ];

  const toneMap = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-slate-500">Akıllı Öneriler</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900">
        Veriye göre bugünkü odak alanları
      </h3>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border p-4 ${
              toneMap[item.tone as keyof typeof toneMap]
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-sm opacity-90">{item.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
