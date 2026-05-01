#!/bin/bash
set -e

echo "1️⃣ App klasörü tespit ediliyor..."

if [ -d "src/app" ]; then
  APP_DIR="src/app"
elif [ -d "app" ]; then
  APP_DIR="app"
else
  echo "❌ app veya src/app klasörü bulunamadı."
  exit 1
fi

echo "App directory: $APP_DIR"

echo "2️⃣ Notification API route oluşturuluyor..."

mkdir -p "$APP_DIR/api/notifications"

cat > "$APP_DIR/api/notifications/route.ts" <<'EOL'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Bildirimler alınamadı" },
      { status: 500 }
    );
  }
}
EOL

echo "3️⃣ Icon conflict kontrol ediliyor..."

mkdir -p backup-icons

if [ -f "public/favicon.ico" ] && [ -f "$APP_DIR/favicon.ico" ]; then
  mv "public/favicon.ico" "backup-icons/public-favicon.ico.bak"
  echo "public/favicon.ico yedeklendi."
fi

if [ -f "public/icon.png" ] && [ -f "$APP_DIR/icon.png" ]; then
  mv "public/icon.png" "backup-icons/public-icon.png.bak"
  echo "public/icon.png yedeklendi."
fi

echo "4️⃣ Notification model kontrol ediliyor..."

if ! grep -q "model Notification" prisma/schema.prisma; then
cat >> prisma/schema.prisma <<'EOL'

model Notification {
  id          String   @id @default(cuid())
  type        String
  title       String
  description String?
  actionUrl   String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
EOL
fi

echo "5️⃣ Prisma generate..."

npx prisma generate

echo "6️⃣ Build testi..."

npm run build

echo ""
echo "✅ Düzeltme tamamlandı."
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Linkler:"
echo "http://localhost:3000"
echo "http://localhost:3000/api/notifications"
