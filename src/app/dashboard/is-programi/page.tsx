import Link from "next/link";
import { getSchedulesForMonth } from "@/app/actions/schedule";
import { WorkCalendar } from "@/components/schedule/WorkCalendar";

export const metadata = {
  title: "İş Programı | Metrix",
};

type CalendarFilter = "ALL" | "OLCU" | "IMALAT" | "MONTAJ" | "TAS" | "GECIKEN";

export default async function WorkSchedulePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const params = searchParams ? await searchParams : {};
  const rawFilter = Array.isArray(params?.filtre) ? params.filtre[0] : params?.filtre;

  const allowedFilters: CalendarFilter[] = ["ALL", "OLCU", "IMALAT", "MONTAJ", "TAS", "GECIKEN"];
  const activeFilter: CalendarFilter = allowedFilters.includes(rawFilter as CalendarFilter)
    ? (rawFilter as CalendarFilter)
    : "ALL";

  const schedules = await getSchedulesForMonth(year, month);

  let olcuBekleyen = 0;
  let imalatBekleyen = 0;
  let montajBekleyen = 0;
  let tasBekleyen = 0;
  let gecikenIsler = 0;

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  for (const schedule of schedules as any[]) {
    const is = schedule.is || {};
    const phases = schedule.phases || [];

    const olcuPhase = phases.find((p: any) => p.phase === "OLCU");

    if (is.urunAdi && olcuPhase?.plannedStart) {
      if (is.tasDurumu !== "alindi") {
        tasBekleyen++;
      }
    }

    for (const phase of phases) {
      if (!phase.plannedStart || !phase.plannedEnd) continue;

      if (!phase.isCompleted) {
        if (phase.phase === "OLCU") olcuBekleyen++;
        if (phase.phase === "IMALAT") imalatBekleyen++;
        if (phase.phase === "MONTAJ") montajBekleyen++;

        const bitis = phase.plannedEnd ? new Date(phase.plannedEnd) : null;
        if (bitis) {
          bitis.setHours(0, 0, 0, 0);
          if (bitis < bugun) gecikenIsler++;
        }
      }
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 max-w-7xl mx-auto">
      <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#312e81_100%)] p-7 text-white">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                OPERASYON KONTROL MERKEZİ
              </p>

              <h1 className="mt-3 text-3xl font-bold">
                İş Programı
              </h1>

              <p className="mt-3 max-w-xl text-sm text-slate-300">
                Ölçü → İmalat → Montaj sürecini tek ekranda yönet. Kutulara tıklayarak takvimi filtrele.
              </p>

              {activeFilter !== "ALL" && (
                <Link
                  href="/dashboard/is-programi"
                  className="mt-5 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Tümünü Göster
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <KpiCard title="Ölçü Bekleyen" value={olcuBekleyen} color="blue" href="/dashboard/is-programi?filtre=OLCU" active={activeFilter === "OLCU"} />
              <KpiCard title="İmalat Bekleyen" value={imalatBekleyen} color="amber" href="/dashboard/is-programi?filtre=IMALAT" active={activeFilter === "IMALAT"} />
              <KpiCard title="Montaj Bekleyen" value={montajBekleyen} color="emerald" href="/dashboard/is-programi?filtre=MONTAJ" active={activeFilter === "MONTAJ"} />
              <KpiCard title="Taş Bekleyen" value={tasBekleyen} color="rose" href="/dashboard/is-programi?filtre=TAS" active={activeFilter === "TAS"} />
              <KpiCard title="Geciken İşler" value={gecikenIsler} color="red" href="/dashboard/is-programi?filtre=GECIKEN" active={activeFilter === "GECIKEN"} />
            </div>
          </div>
        </div>
      </section>

      <WorkCalendar
        initialSchedules={schedules}
        initialYear={year}
        initialMonth={month}
        initialFilter={activeFilter}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  color,
  href,
  active,
}: {
  title: string;
  value: number;
  color: "blue" | "amber" | "emerald" | "rose" | "red";
  href: string;
  active: boolean;
}) {
  const map = {
    blue: "text-blue-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    red: "text-red-300",
  };

  return (
    <Link
      href={href}
      className={[
        "rounded-2xl border p-3 backdrop-blur-sm transition hover:scale-[1.015] min-w-0",
        active
          ? "border-white/40 bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.20)]"
          : "border-white/10 bg-white/10 hover:bg-white/15",
      ].join(" ")}
    >
      <p className="break-words text-[10px] font-black uppercase leading-tight tracking-[0.16em] text-slate-300">{title}</p>
      <p className={`mt-2 text-2xl font-black ${map[color]}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold text-slate-300">Filtrele →</p>
    </Link>
  );
}
