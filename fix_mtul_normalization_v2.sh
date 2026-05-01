#!/bin/bash
set -e

echo "1️⃣ Geniş mtül/maliyet dosya araması yapılıyor..."

FILES=$(grep -rliE "pahlama|yapıştırma|yapistirma|toplama|45 kesim|45kesim|kesim45|mtül|mtul|stres alma|fason" src app 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "❌ İlgili dosya hâlâ bulunamadı."
  echo "Şu komutun çıktısını bana gönder:"
  echo "grep -RniE \"pahlama|yapıştırma|yapistirma|45|mtül|mtul|toplama|stres|fason\" src app"
  exit 1
fi

echo "Bulunan dosyalar:"
echo "$FILES"

echo "2️⃣ Normalize helper oluşturuluyor..."

mkdir -p src/lib

cat > src/lib/normalizeMtul.ts <<'EOL'
export function normalizeMtulInput(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  raw = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");

  if (!raw) return 0;

  const dotParts = raw.split(".");
  if (dotParts.length > 2) {
    raw = dotParts[0] + "." + dotParts.slice(1).join("");
  }

  let n = Number(raw);
  if (!Number.isFinite(n)) return 0;

  // Bu alanlar mtül alanı.
  // Kullanıcı 305 yazarsa 305 cm kabul edilip 3.05 mtül yapılır.
  if (n > 100) n = n / 100;

  return Math.round(n * 1000) / 1000;
}

export function normalizeMtulDisplay(value: unknown): string {
  const n = normalizeMtulInput(value);
  return n ? String(n) : "";
}
EOL

echo "3️⃣ Dosyalar otomatik patchleniyor..."

node <<'NODE'
const fs = require("fs");

const files = process.env.FILES.split(/\s+/).filter(Boolean);

const keywords = /(pahlama|yapıştırma|yapistirma|toplama|45|kesim|mtül|mtul|stres|fason)/i;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

  let code = fs.readFileSync(file, "utf8");
  const original = code;

  // parseFloat(x) ve Number(x) içindeki değişken adı ilgili operasyonlardan biriyse normalize et
  code = code.replace(/parseFloat\(([^()\n]+)\)/g, (m, inner) => {
    return keywords.test(inner) ? `normalizeMtulInput(${inner})` : m;
  });

  code = code.replace(/Number\(([^()\n]+)\)/g, (m, inner) => {
    return keywords.test(inner) ? `normalizeMtulInput(${inner})` : m;
  });

  // Türkçe virgüllü inputlar için value hesaplarında güvenlik
  code = code.replace(/Math\.max\(0,\s*([^)\n]+)\)/g, (m, inner) => {
    return keywords.test(inner) ? `Math.max(0, normalizeMtulInput(${inner}))` : m;
  });

  if (code !== original) {
    if (!code.includes('from "@/lib/normalizeMtul"')) {
      const importLine = 'import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";\n';
      if (code.startsWith("import ")) {
        code = code.replace(/(import[\s\S]*?;\n)/, `$1${importLine}`);
      } else {
        code = importLine + code;
      }
    }

    fs.writeFileSync(file, code);
    console.log("✅ Patchlendi:", file);
  } else {
    console.log("ℹ️ Sadece ilgili bulundu, otomatik değişiklik gerekmedi:", file);
  }
}
NODE

echo "4️⃣ Build testi..."

npx prisma generate
npm run build

echo ""
echo "✅ Mtül normalize v2 tamamlandı."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
