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
  if (!pdfUrl) {
    return <span className="pdfBtn disabled">PDF hazırlanıyor</span>;
  }

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="pdfBtn"
      onClick={() => {
        sendEvent(teklifNo, "pdf_acildi", {
          source: "teklif_page_button",
        });
      }}
    >
      PDF Teklifi Aç
    </a>
  );
}
