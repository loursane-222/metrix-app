"use client";

import { useEffect } from "react";

async function sendEvent(teklifNo: string, event: string, meta?: any) {
  try {
    await fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teklifNo, event, meta }),
      keepalive: true,
    });
  } catch {}
}

export function TeklifViewTracker({ teklifNo }: { teklifNo: string }) {
  useEffect(() => {
    if (!teklifNo) return;
    sendEvent(teklifNo, "goruntulendi", {
      source: "teklif_page",
      userAgent: navigator.userAgent,
    });
  }, [teklifNo]);

  return null;
}

export function PdfTrackButton({
  teklifNo,
  pdfUrl,
}: {
  teklifNo: string;
  pdfUrl: string;
}) {
  return (
    <button
      type="button"
      className="pdfBtn"
      onClick={async () => {
        await sendEvent(teklifNo, "pdf_acildi", {
          source: "teklif_page_button",
        });
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
      }}
    >
      PDF Teklifi Aç
    </button>
  );
}
