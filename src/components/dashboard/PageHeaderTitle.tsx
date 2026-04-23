"use client";

import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/atolye": "Atölye",
  "/dashboard/personel": "Personel",
  "/dashboard/isler": "İşler",
  "/dashboard/musteriler": "Müşteriler",
  "/dashboard/is-programi": "İş Programı",
  "/dashboard/yeni-is": "Yeni İş",
  "/dashboard/plaka-planlayici": "Plaka Planlayıcı",
};

export default function PageHeaderTitle() {
  const pathname = usePathname();
  return <>{titleMap[pathname] || "Panel"}</>;
}
