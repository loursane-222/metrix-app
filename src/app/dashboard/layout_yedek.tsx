import PageHeaderTitle from "@/components/dashboard/PageHeaderTitle";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import DailyPlanPopup from "@/components/dashboard/DailyPlanPopup";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <Sidebar />
      <main className="min-h-screen md:ml-72">
        <div className="p-4 md:p-8">
          <Topbar />
          <DailyPlanPopup />
          {children}
        </div>
      </main>
    </div>
  );
}
