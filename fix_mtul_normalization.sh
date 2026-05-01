#!/bin/bash
set -e

echo "1️⃣ Mtül alanlarını içeren dosyalar aranıyor..."

FILES=$(grep -rl "45 Kesim Mtül\|Pahlama Mtül\|Yapıştırma / Toplama Mtül\|Stres Alma Mtül\|Fason Ebatlama Mtül" src app 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "❌ Mtül alanlarını içeren dosya bulunamadı."
  echo "Manuel teşhis için:"
  echo "grep -rl \"Pahlama Mtül\" src app"
  exit 1
fi

echo "Bulunan dosyalar:"
echo "$FILES"

echo "2️⃣ Ortak mtül normalize helper oluşturuluyor..."

mkdir -p src/lib

cat > src/lib/normalizeMtul.ts <<'EOL'
export function normalizeMtulInput(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();

  if (!raw) return 0;

  raw = raw
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (!raw) return 0;

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }

  let numberValue = Number(raw);

  if (!Number.isFinite(numberValue)) return 0;

  // Kullanıcı 305 yazarsa bunun 305 cm olduğunu varsayıp 3.05 mtül yapıyoruz.
  // Çünkü bu alanların tamamı mtül alanıdır.
  if (numberValue > 100) {
    numberValue = numberValue / 100;
  }

  return Math.round(numberValue * 1000) / 1000;
}

export function normalizeMtulDisplay(value: unknown): string {
  const normalized = normalizeMtulInput(value);
  if (!normalized) return "";
  return String(normalized);
}
EOL

echo "3️⃣ API ve hesaplama dosyalarında güvenli normalize fonksiyonu enjekte ediliyor..."

# Sayısal hesaplarda kullanılmak üzere en çok geçen parseFloat/Number kullanımlarını güvenli hale getirmek için
# sadece mtül alanı geçen dosyalara helper import edilir.
for file in $FILES; do
  echo "Patchleniyor: $file"

  if ! grep -q "normalizeMtulInput" "$file"; then
    if grep -q "^import " "$file"; then
      perl -0777 -i -pe 's/(import .*?;\n)/$1import { normalizeMtulInput, normalizeMtulDisplay } from "\@\/lib\/normalizeMtul";\n/s' "$file"
    else
      perl -0777 -i -pe 's/^/import { normalizeMtulInput, normalizeMtulDisplay } from "\@\/lib\/normalizeMtul";\n/s' "$file"
    fi
  fi

  # mtul / mtül içerikli alanlarda parseFloat ve Number kullanımlarını daha güvenli hale getirme
  perl -0777 -i -pe 's/parseFloat\(([^)]*mtul[^)]*)\)/normalizeMtulInput($1)/gi' "$file"
  perl -0777 -i -pe 's/parseFloat\(([^)]*Mtul[^)]*)\)/normalizeMtulInput($1)/g' "$file"
  perl -0777 -i -pe 's/parseFloat\(([^)]*mtül[^)]*)\)/normalizeMtulInput($1)/gi' "$file"

  perl -0777 -i -pe 's/Number\(([^)]*mtul[^)]*)\)/normalizeMtulInput($1)/gi' "$file"
  perl -0777 -i -pe 's/Number\(([^)]*Mtul[^)]*)\)/normalizeMtulInput($1)/g' "$file"
  perl -0777 -i -pe 's/Number\(([^)]*mtül[^)]*)\)/normalizeMtulInput($1)/gi' "$file"
done

echo "4️⃣ Kullanıcı inputtan çıkınca 305 -> 3.05 dönüşümü için blur patch deneniyor..."

for file in $FILES; do
  if grep -q "Pahlama Mtül\|45 Kesim Mtül\|Yapıştırma / Toplama Mtül" "$file"; then
    if ! grep -q "handleMtulBlur" "$file"; then
      perl -0777 -i -pe 's/(function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/$1\n  const handleMtulBlur = (value: unknown) => normalizeMtulDisplay(value);\n/s' "$file" || true
    fi
  fi
done

echo "5️⃣ Build testi çalışıyor..."

npx prisma generate
npm run build

echo ""
echo "✅ Mtül normalize helper eklendi ve build başarılıysa işlem tamam."
echo ""
echo "Kontrol:"
echo "- 305 yazınca hesapta 3.05 gibi davranmalı"
echo "- 3,05 yazınca 3.05 olmalı"
echo "- 3.05 yazınca aynı kalmalı"
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
