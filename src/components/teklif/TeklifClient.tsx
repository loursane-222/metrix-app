"use client";

import { useEffect } from "react";

export default function TeklifClient({ teklifNo, pdfUrl }: any) {

  useEffect(() => {
    fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teklifNo,
        event: "goruntulendi"
      }),
      keepalive: true
    });
  }, [teklifNo]);

  const openPdf = () => {
    fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teklifNo,
        event: "pdf_acildi"
      })
    });

    window.open(pdfUrl, "_blank");
  };

  return (
    <button
      onClick={openPdf}
      style={{
        padding: "12px 20px",
        background: "#111",
        color: "#fff",
        borderRadius: "8px",
        marginTop: "20px",
        cursor: "pointer"
      }}
    >
      PDF Teklifi Aç
    </button>
  );
}
