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
    <div className="flex flex-col h-[calc(100vh-64px)] px-4 py-4 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">İş Programı</h1>
        <p className="text-sm text-gray-500">
          Siparişlerin Ölçü, İmalat ve Montaj aşamalarını takip edin
        </p>
      </div>
      <WorkCalendar
        initialSchedules={schedules}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
