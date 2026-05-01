#!/bin/bash
set -e

FILE="src/app/dashboard/musteriler/page.tsx"

echo "1️⃣ Mobil detay görünürlüğü fix..."

perl -0777 -i -pe '
s/\{\!aktif \|\| \!a \? \(/false && (/g
' "$FILE"

echo "2️⃣ Mobilde detay görünmesini sağlıyoruz..."

perl -0777 -i -pe '
s/\)\s*:\s*\(/) : (/g
' "$FILE"

echo "3️⃣ Floating Yeni Müşteri butonu ekleniyor..."

cat >> "$FILE" <<'EOL'

{/* MOBILE FLOATING BUTTON */}
<div className="fixed bottom-6 right-6 z-50 md:hidden">
  <button
    onClick={() => {
      setAktif(null)
      setDuzenle(false)
    }}
    className="rounded-full bg-emerald-500 px-5 py-4 text-lg font-bold text-black shadow-xl"
  >
    + Yeni
  </button>
</div>

{/* MOBILE DETAIL PANEL */}
{aktif && (
  <div className="fixed inset-0 z-40 bg-slate-900 p-4 md:hidden overflow-auto">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold">{musteriAdi(aktif)}</h2>
      <button onClick={() => setAktif(null)} className="text-white text-xl">✕</button>
    </div>

    <div className="mt-4 space-y-4">
      <button
        onClick={duzenleAc}
        className="w-full rounded-xl bg-white/10 p-3 font-semibold"
      >
        Düzenle
      </button>

      <button
        onClick={kaydet}
        className="w-full rounded-xl bg-emerald-500 p-3 font-bold text-black"
      >
        Kaydet
      </button>
    </div>
  </div>
)}
EOL

echo "4️⃣ Build alınıyor..."

npm run build

echo ""
echo "✅ Mobil müşteri sayfası düzeltildi"
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000/dashboard/musteriler"
