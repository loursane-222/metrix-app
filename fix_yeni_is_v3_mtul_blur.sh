#!/bin/bash
set -e

FILE="src/app/dashboard/yeni-is-v3/page.tsx"

echo "1️⃣ yeni-is-v3 mtül blur normalize patch..."

python3 <<'PY'
from pathlib import Path
p = Path("src/app/dashboard/yeni-is-v3/page.tsx")
s = p.read_text()

if '@/lib/normalizeMtul' not in s:
    # use client varsa onun sonrasına, yoksa dosya başına ekle
    if s.startswith('"use client";'):
        s = s.replace('"use client";\n', '"use client";\n\nimport { normalizeMtulDisplay } from "@/lib/normalizeMtul";\n', 1)
    elif s.startswith("'use client'"):
        s = s.replace("'use client'\n", "'use client'\n\nimport { normalizeMtulDisplay } from \"@/lib/normalizeMtul\";\n", 1)
    else:
        s = 'import { normalizeMtulDisplay } from "@/lib/normalizeMtul";\n' + s

# MtulRow component input'una onBlur ekle
old = 'onChange={(e) => setMtul(e.target.value)}'
new = 'onChange={(e) => setMtul(e.target.value)}\n          onBlur={(e) => setMtul(normalizeMtulDisplay(e.target.value))}'

if old in s and 'onBlur={(e) => setMtul(normalizeMtulDisplay(e.target.value))}' not in s:
    s = s.replace(old, new)

p.write_text(s)
PY

echo "2️⃣ Build testi..."

npm run build

echo ""
echo "✅ Mtül input blur normalize düzeltildi."
echo "305 yazıp alandan çıkınca 3.05 olmalı."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000/dashboard/yeni-is-v3"
