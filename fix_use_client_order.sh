#!/bin/bash
set -e

echo "1️⃣ use client sırası düzeltiliyor..."

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do

  if grep -q '"use client"' "$file" || grep -q "'use client'" "$file"; then

    # use client satırını al
    USE_CLIENT=$(grep -E '"use client"|'\''use client'\''' "$file" | head -1)

    # tüm use client satırlarını sil
    perl -0777 -i -pe 's/^\s*["'\'']use client["'\''];?\s*//gm' "$file"

    # dosyanın en üstüne ekle
    perl -0777 -i -pe "s/^/$USE_CLIENT\n/" "$file"

    echo "✔ düzeltildi: $file"
  fi

done

echo "2️⃣ Build alınıyor..."

npm run build

echo ""
echo "✅ use client hatası çözüldü"
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
