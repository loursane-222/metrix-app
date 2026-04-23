import { getSchedulesForMonth } from "@/app/actions/schedule";
import { WorkCalendar } from "@/components/schedule/WorkCalendar";

export const metadata = {
  title: "İş Programı | Metrix",
};

export default async function WorkSchedulePage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const schedules = await getSchedulesForMonth(year, month);

  return (
    <div className="space-y-6 px-4 py-4 max-w-7xl mx-auto">
      <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.35),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e1b4b_100%)] p-7 text-white">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Operasyon Kontrol Merkezi
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
                İş Programı
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Siparişlerin Ölçü, İmalat ve Montaj görevlerini; tarih, taş durumu ve personel atamalarıyla birlikte tek takvim üzerinden yönet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Aktif Kayıt</p>
                <p className="mt-3 text-3xl font-bold">{schedules.length}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Takip Alanı</p>
                <p className="mt-3 text-3xl font-bold">Takvim</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Yoğunluk</p>
                <p className="mt-3 text-xl font-bold">Görev + Personel</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Kritik Kullanım</p>
                <p className="mt-3 text-xl font-bold">Gün Detayı</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WorkCalendar
        initialSchedules={schedules}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
