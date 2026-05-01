#!/bin/bash
set -e

echo "1️⃣ Yanlış yere giren normalize import satırları temizleniyor..."

find src app -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read file; do
  perl -0777 -i -pe '
    s/\n\s*import\s+\{\s*normalizeMtulInput\s*,\s*normalizeMtulDisplay\s*\}\s+from\s+["'\'']@\/lib\/normalizeMtul["'\''];\s*\n/\n/g
  ' "$file"
done

echo "2️⃣ normalizeMtul helper dosyası garanti ediliyor..."

mkdir -p src/lib

cat > src/lib/normalizeMtul.ts <<'EOL'
export function normalizeMtulInput(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  raw = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!raw) return 0;

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }

  let n = Number(raw);
  if (!Number.isFinite(n)) return 0;

  if (n > 100) n = n / 100;

  return Math.round(n * 1000) / 1000;
}

export function normalizeMtulDisplay(value: unknown): string {
  const n = normalizeMtulInput(value);
  return n ? String(n) : "";
}
EOL

echo "3️⃣ Sadece normalizeMtulInput kullanılan dosyalara import ekleniyor..."

find src app -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read file; do
  if grep -q "normalizeMtulInput" "$file" && ! grep -q "@/lib/normalizeMtul" "$file"; then
    perl -0777 -i -pe '
      if (!/^import\s+\{\s*normalizeMtulInput/m) {
        s/\A/import { normalizeMtulInput, normalizeMtulDisplay } from "\@\/lib\/normalizeMtul";\n/;
      }
    ' "$file"
    echo "Import eklendi: $file"
  fi
done

echo "4️⃣ Build testi..."

npx prisma generate
npm run build

echo ""
echo "✅ Yanlış import düzeltildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
