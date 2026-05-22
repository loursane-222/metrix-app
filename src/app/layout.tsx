import PushPermission from "@/components/push/PushPermission";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AppVersionGuard from "@/components/AppVersionGuard";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metrix — Atölye Yönetimi",
  description: "Tezgah atölyeleri için maliyet ve teklif yönetim sistemi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>
) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppVersionGuard />
        {children}
              <PushPermission />
      </body>
    </html>
  );
}
