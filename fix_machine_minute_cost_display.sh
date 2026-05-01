#!/bin/bash
set -e

echo "1️⃣ Makine dk maliyeti helper oluşturuluyor..."

mkdir -p src/lib

cat > src/lib/machineCost.ts <<'EOL'
export function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getMachineMinuteCost(machine: any): number {
  if (!machine) return 0;

  const candidates = [
    machine.dakikaMaliyeti,
    machine.dkMaliyeti,
    machine.dakikaMaliyet,
    machine.dkMaliyet,
    machine.birimDakikaMaliyeti,
    machine.dakikaBirimMaliyet,
    machine.maliyetDakika,
    machine.minuteCost,
    machine.costPerMinute,
    machine.dkBirimMaliyet,
    machine.makineDakikaMaliyeti,
    machine.hesaplananDakikaMaliyeti,
    machine.calculatedMinuteCost,
  ];

  for (const candidate of candidates) {
    const n = toSafeNumber(candidate);
    if (n > 0) return Math.round(n * 100) / 100;
  }

  return 0;
}

export function formatMachineMinuteCost(machine: any): string {
  const cost = getMachineMinuteCost(machine);
  if (!cost) return "Maliyet tanımsız";
  return `${cost.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}₺/dk`;
}
EOL

echo "2️⃣ ₺/dk geçen dosyalar bulunuyor..."

FILES=$(grep -rli "₺/dk" src app 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "❌ ₺/dk geçen dosya bulunamadı."
  echo "Şu komutun çıktısını bana gönder:"
  echo "grep -Rni \"dk\" src app | head -80"
  exit 1
fi

echo "$FILES"

echo "3️⃣ Dosyalar güvenli şekilde patchleniyor..."

node <<'NODE'
const fs = require("fs");

const files = (process.env.FILES || "").split(/\s+/).filter(Boolean);

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

  let code = fs.readFileSync(file, "utf8");
  const before = code;

  // Yanlış default fallback: 0.01₺/dk görünmesini engelle
  code = code.replace(/0\.01\s*₺\/dk/g, "Maliyet tanımsız");

  // Template içinde makine maliyeti gösterimlerini helper'a bağla
  code = code.replace(/\$\{\s*Number\((makine|machine|m)\.[^)]*\)\.toFixed\([^)]*\)\s*\}\s*₺\/dk/g, "${formatMachineMinuteCost($1)}");
  code = code.replace(/\$\{\s*(makine|machine|m)\.[^}]*\s*\}\s*₺\/dk/g, "${formatMachineMinuteCost($1)}");

  // JSX içinde sabit 0.01 fallback varsa kaldır
  code = code.replace(/\|\|\s*0\.01/g, "|| 0");

  if (code !== before) {
    if (!code.includes('from "@/lib/machineCost"')) {
      code = code.replace(
        /\A/,
        'import { getMachineMinuteCost, formatMachineMinuteCost } from "@/lib/machineCost";\n'
      );
    }

    fs.writeFileSync(file, code);
    console.log("✅ Patchlendi:", file);
  } else {
    console.log("ℹ️ Değişiklik gerekmedi:", file);
  }
}
NODE

echo "4️⃣ Build testi..."

npx prisma generate
npm run build

echo ""
echo "✅ Makine dk maliyeti gösterimi düzeltildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000"
