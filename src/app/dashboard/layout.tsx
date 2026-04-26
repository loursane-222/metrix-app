import PageHeaderTitle from "@/components/dashboard/PageHeaderTitle";
import Sidebar from "@/components/dashboard/Sidebar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dış arka plan koyu premium renge çevrildi
    <div className="min-h-screen bg-[#0B1120]">
      <Sidebar />
      {/* Kaydırmayı tamamen engellemek için h-screen ve overflow-hidden eklendi */}
      <main className="h-screen md:ml-72 overflow-hidden bg-[#0B1120]">
        {/* Topbar (beyaz panel) silindi ve boşluklar sıfırlandı, böylece sayfa tam oturacak */}
        <div className="h-full w-full">
          <DailyPlanPopup />
          {children}
        </div>
      </main>
    </div>
  );
}
