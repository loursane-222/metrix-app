"use client";

import { useEffect, useState } from "react";

const MENUS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "is-programi", label: "İş Programı" },
  { key: "teklifler", label: "Teklifler" },
  { key: "musteriler", label: "Müşteriler" },
  { key: "personel", label: "Personel" },
  { key: "ayarlar", label: "Ayarlar" },
];

export default function YetkiPage({ params }: { params: { id: string } }) {
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/admin/menu-permissions?userId=${params.id}`)
      .then((res) => res.json())
      .then((data) => setPermissions(data));
  }, [params.id]);

  function getPermission(menuKey: string) {
    return (
      permissions.find((p) => p.menuKey === menuKey) || {
        menuKey,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }
    );
  }

  function toggle(menuKey: string, field: string) {
    const current = getPermission(menuKey);

    setPermissions((prev) => {
      const exists = prev.some((p) => p.menuKey === menuKey);

      if (!exists) {
        return [...prev, { ...current, [field]: !current[field] }];
      }

      return prev.map((p) =>
        p.menuKey === menuKey ? { ...p, [field]: !p[field] } : p
      );
    });
  }

  async function save() {
    await fetch("/api/admin/menu-permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: params.id,
        permissions,
      }),
    });

    alert("Yetkiler kaydedildi");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Personel Menü Yetkileri</h1>

      {MENUS.map((menu) => {
        const p = getPermission(menu.key);

        return (
          <div key={menu.key} className="border rounded-xl p-4 space-y-3">
            <div className="font-semibold">{menu.label}</div>

            <div className="flex gap-5 flex-wrap">
              {[
                ["canView", "Gör"],
                ["canCreate", "Ekle"],
                ["canEdit", "Düzenle"],
                ["canDelete", "Sil"],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!p[field]}
                    onChange={() => toggle(menu.key, field)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={save}
        className="bg-black text-white px-5 py-2 rounded-lg"
      >
        Kaydet
      </button>
    </div>
  );
}
