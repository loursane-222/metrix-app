#!/bin/bash
set -e

FILE="src/app/dashboard/yeni-is-v3/page.tsx"

echo "1️⃣ makineMaliyet fonksiyonu düzeltiliyor..."

perl -0777 -i -pe '
s/function makineMaliyet\(id: string\) \{[\s\S]*?\}/function makineMaliyet(id: string) {
  const m = makineler.find((x) => x.id === id);
  if (!m) return 0;

  const val =
    m.dakikalikMaliyet ??
    m.dkMaliyet ??
    m.dakikaMaliyet ??
    m.hesaplananDakikaMaliyeti ??
    m.minuteCost ??
    m.costPerMinute ??
    0;

  return Number(val) || 0;
}/
' "$FILE"

echo "2️⃣ UI makine gösterimi düzeltiliyor..."

perl -0777 -i -pe '
s/Number\(m\.dakikalikMaliyet \|\| 0\)\.toFixed\(2\)/Number(
  m.dakikalikMaliyet ??
  m.dkMaliyet ??
  m.dakikaMaliyet ??
  m.hesaplananDakikaMaliyeti ??
  m.minuteCost ??
  0
).toFixed(2)/g
' "$FILE"

echo "3️⃣ Build testi..."

npm run build

echo ""
echo "✅ Makine maliyeti artık doğru field'dan okunuyor."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
