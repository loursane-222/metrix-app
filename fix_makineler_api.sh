#!/bin/bash
set -e

FILE="src/app/api/makineler-lite/route.ts"

echo "1️⃣ makineler-lite API tamamen yeniden yazılıyor..."

cat > "$FILE" <<'EOL'
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const makineler = await prisma.makine.findMany({
      orderBy: { createdAt: "desc" }
    });

    // Güvenli dönüşüm
    const temiz = makineler.map((m) => ({
      id: m.id,
      makineAdi: m.makineAdi,
      dakikalikMaliyet: Number(m.dakikalikMaliyet) || 0,
      // DEBUG için ekliyoruz:
      tumVeri: m
    }));

    return NextResponse.json({ makineler: temiz });

  } catch (error) {
    console.error("MAKINE API HATA:", error);
    return NextResponse.json(
      { error: "Makine verisi alınamadı" },
      { status: 500 }
    );
  }
}
EOL

echo "2️⃣ Build alınıyor..."

npm run build

echo ""
echo "✅ API düzeltildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Test link:"
echo "http://localhost:3000/api/makineler-lite"
