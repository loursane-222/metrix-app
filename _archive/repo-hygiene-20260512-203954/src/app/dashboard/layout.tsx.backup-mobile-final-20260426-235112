import Sidebar from "@/components/dashboard/Sidebar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      <Sidebar />

      {/* 🔥 ANA FIX: overflow-hidden kaldırıldı */}
      <main className="min-h-screen md:ml-72 bg-[#0B1120] overflow-y-auto">
        <div className="min-h-screen w-full">
          <DailyPlanPopup />
          {children}
        </div>
      </main>
    </div>
  );
}
