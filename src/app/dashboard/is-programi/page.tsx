import { getSchedulesForMonth } from "@/app/actions/schedule";
import { PremiumWorkCalendar } from "@/components/schedule/PremiumWorkCalendar";
import { WhatsappOnayPopup } from "@/components/schedule/WhatsappOnayPopup";

export const metadata = {
  title: "İş Programı | Metrix",
};

function safeJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();

  const year = Number(params.year) || today.getFullYear();
  const month = Math.max(1, Math.min(12, Number(params.month) || today.getMonth() + 1));

  const schedulesRaw: any[] = await getSchedulesForMonth(year, month);
  const schedules = safeJson(schedulesRaw);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#030712] p-2 md:p-3">
      <WhatsappOnayPopup />
      <PremiumWorkCalendar
        initialSchedules={schedules}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
