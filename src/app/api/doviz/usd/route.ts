import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "TCMB kuru alınamadı." },
        { status: 502 }
      );
    }

    const xml = await res.text();

    const usdBlock = xml.match(/<Currency[^>]*CurrencyCode="USD"[^>]*>([\s\S]*?)<\/Currency>/);
    const sellingMatch = usdBlock?.[1]?.match(/<ForexSelling>(.*?)<\/ForexSelling>/);

    const forexSelling = Number(String(sellingMatch?.[1] || "").replace(",", "."));

    if (!Number.isFinite(forexSelling) || forexSelling <= 0) {
      return NextResponse.json(
        { error: "USD satış kuru okunamadı." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      currency: "USD",
      source: "TCMB",
      type: "Döviz Satış",
      rate: forexSelling,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Kur servisine ulaşılamadı." },
      { status: 500 }
    );
  }
}
