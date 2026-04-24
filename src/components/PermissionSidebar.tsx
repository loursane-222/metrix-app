"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_MENUS } from "@/lib/menu";

type Permission = {
  menuKey: string;
  canView: boolean;
};

export default function PermissionSidebar() {
  const [menus, setMenus] = useState<typeof APP_MENUS[number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenus() {
      try {
        const userRes = await fetch("/api/auth/current-user", {
          cache: "no-store",
        });

        const currentUser = await userRes.json();

        if (!currentUser?.userId) {
          setMenus([]);
          return;
        }

        if (currentUser.role === "ADMIN") {
          setMenus([...APP_MENUS]);
          return;
        }

        const permissionRes = await fetch(
          `/api/admin/menu-permissions?userId=${currentUser.userId}`,
          { cache: "no-store" }
        );

        const permissions: Permission[] = await permissionRes.json();

        const allowedMenuKeys = permissions
          .filter((p) => p.canView === true)
          .map((p) => p.menuKey);

        setMenus(APP_MENUS.filter((menu) => allowedMenuKeys.includes(menu.key)));
      } catch (error) {
        console.error("Sidebar permission error:", error);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    }

    loadMenus();
  }, []);

  return (
    <aside className="w-72 min-h-screen bg-zinc-950 text-white border-r border-white/10 p-5">
      <div className="mb-8">
        <div className="text-xl font-bold tracking-tight">Metrix</div>
        <div className="text-xs text-zinc-400 mt-1">Yetkili Panel</div>
      </div>

      <nav className="space-y-2">
        {loading && (
          <div className="text-sm text-zinc-500 px-4 py-3">Menü yükleniyor...</div>
        )}

        {!loading &&
          menus.map((menu) => (
            <Link
              key={menu.key}
              href={menu.href}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition"
            >
              {menu.label}
            </Link>
          ))}

        {!loading && menus.length === 0 && (
          <div className="text-sm text-zinc-500 px-4 py-3">
            Yetkili menü bulunamadı.
          </div>
        )}
      </nav>
    </aside>
  );
}
