#!/bin/bash
set -e

FILE="src/app/dashboard/musteriler/page.tsx"

echo "1️⃣ Mobil düzenle akışı düzeltiliyor..."

python3 <<'PY'
from pathlib import Path

p = Path("src/app/dashboard/musteriler/page.tsx")
s = p.read_text()

old = '''              onClick={duzenleAc}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white"
            >
              Düzenle'''

new = '''              onClick={() => {
                duzenleAc()
                setMobilDetayAcik(false)
              }}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white"
            >
              Düzenle'''

if old not in s:
    print("❌ Hedef Düzenle butonu bulunamadı.")
    raise SystemExit(1)

s = s.replace(old, new, 1)

# Mobil paneldeki Kaydet butonu yanlışlıkla form görünmeden kaydetmeye çalışmasın.
s = s.replace(
'''            <button
              onClick={kaydet}
              className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950"
            >
              Kaydet
            </button>''',
'''            <button
              onClick={() => {
                duzenleAc()
                setMobilDetayAcik(false)
              }}
              className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950"
            >
              Düzenle ve Kaydet
            </button>''',
1
)

p.write_text(s)
PY

echo "2️⃣ Build testi..."
npm run build

echo ""
echo "✅ Mobil düzenle akışı düzeltildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000/dashboard/musteriler"
