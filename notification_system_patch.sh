#!/bin/bash
set -e

echo "1️⃣ Doğru Prisma schema kontrol ediliyor..."

SCHEMA="prisma/schema.prisma"

if [ ! -f "$SCHEMA" ]; then
  echo "❌ prisma/schema.prisma bulunamadı."
  exit 1
fi

echo "2️⃣ Notification modeli ekleniyor..."

if ! grep -q "model Notification" "$SCHEMA"; then
cat >> "$SCHEMA" <<'EOL'

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
else
  echo "Notification modeli zaten var, geçiliyor."
fi

echo "3️⃣ Prisma migration çalışıyor..."

npx prisma migrate dev --name add_notification_system

echo "4️⃣ Prisma client generate..."

npx prisma generate

echo "5️⃣ Notification API oluşturuluyor..."

mkdir -p app/api/notifications

cat > app/api/notifications/route.ts <<'EOL'
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

echo "6️⃣ Build testi çalışıyor..."

npm run build

echo ""
echo "✅ Bildirim altyapısı başarıyla kuruldu."
echo ""
echo "Local çalıştırmak için:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Kontrol linkleri:"
echo "http://localhost:3000"
echo "http://localhost:3000/api/notifications"
