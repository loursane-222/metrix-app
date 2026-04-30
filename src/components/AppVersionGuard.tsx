"use client";

import { useEffect } from "react";

export default function AppVersionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const nextVersion = String(data?.version || "");
        if (!nextVersion || cancelled) return;

        const key = "metrix_app_version";
        const currentVersion = localStorage.getItem(key);

        if (currentVersion && currentVersion !== nextVersion) {
          localStorage.setItem(key, nextVersion);
          window.location.reload();
          return;
        }

        localStorage.setItem(key, nextVersion);
      } catch {
        // Sessiz geç: bağlantı yoksa uygulama normal açılmaya devam eder.
      }
    }

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
