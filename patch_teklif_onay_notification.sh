#!/bin/bash
set -e

echo "1️⃣ Teklif onay API dosyası aranıyor..."

TARGET_FILE=$(grep -rl "whatsappOnay" src/app app 2>/dev/null | grep -E "route\.ts$" | head -n 1)

if [ -z "$TARGET_FILE" ]; then
  echo "❌ whatsappOnay geçen route.ts bulunamadı."
  echo "Lütfen şu komutu çalıştırıp sonucu bana at:"
  echo "grep -rl \"whatsappOnay\" src app 2>/dev/null"
  exit 1
fi

echo "Bulunan dosya: $TARGET_FILE"

cp "$TARGET_FILE" "$TARGET_FILE.bak.notification"

echo "2️⃣ Bildirim helper dosyası oluşturuluyor..."

mkdir -p src/lib

cat > src/lib/notifications.ts <<'EOL'
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  type?: string;
  title: string;
  description?: string;
  actionUrl: string;
};

export async function createNotificationSafe(input: NotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        type: input.type ?? "INFO",
        title: input.title,
        description: input.description,
        actionUrl: input.actionUrl,
      },
    });
  } catch (error) {
    console.error("Notification create error:", error);
    return null;
  }
}
EOL

echo "3️⃣ Teklif onay route içine notification import ekleniyor..."

if ! grep -q "createNotificationSafe" "$TARGET_FILE"; then
  perl -0777 -i -pe 's/(import .*?;\n)/$1import { createNotificationSafe } from "\@\/lib\/notifications";\n/s' "$TARGET_FILE"
fi

echo "4️⃣ whatsappOnay güncellemesinden sonra bildirim üretimi ekleniyor..."

if ! grep -q "Müşteri teklifi onayladı" "$TARGET_FILE"; then
  perl -0777 -i -pe '
    s/(whatsappOnay\s*:\s*true[\s\S]{0,500}?\}\s*\);)/$1\n\n    await createNotificationSafe({\n      type: "ACTION",\n      title: "Müşteri teklifi onayladı",\n      description: "Onaylanan teklif için ölçü ve taş stok sürecini kontrol edin.",\n      actionUrl: "\/isler",\n    });/s
  ' "$TARGET_FILE"
fi

echo "5️⃣ Build testi çalışıyor..."

npx prisma generate
npm run build

echo ""
echo "✅ Müşteri teklif onayı bildirimi bağlandı."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Linkler:"
echo "Ana uygulama: http://localhost:3000"
echo "Bildirim API: http://localhost:3000/api/notifications"
