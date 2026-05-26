"use client";

import { useEffect, useState } from "react";

export default function TeklifClient({ teklifNo, pdfUrl }: any) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 760);
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

  return (
    <>
      {isMobile && (
        <button
          onClick={() => history.back()}
          style={{
            position: "fixed",
            top: "calc(12px + env(safe-area-inset-top, 0px))",
            left: "12px",
            zIndex: 9999,
            background: "rgba(15,23,42,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px",
            padding: "9px 16px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          ← Geri
        </button>
      )}
    </>
  );
}
