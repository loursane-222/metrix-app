import PushPermission from "@/components/push/PushPermission";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
              <PushPermission />
      </body>
    </html>
  );
}