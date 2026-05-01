#!/bin/bash
set -e

FILE="src/app/dashboard/musteriler/page.tsx"

echo "1️⃣ Bozulan müşteriler sayfası son sağlam commit'e geri alınıyor..."
git restore "$FILE"

echo "2️⃣ Mobil detay ve yeni müşteri akışı güvenli şekilde ekleniyor..."

python3 <<'PY'
from pathlib import Path

p = Path("src/app/dashboard/musteriler/page.tsx")
s = p.read_text()

# mobil detay state
if "mobilDetayAcik" not in s:
    s = s.replace(
        "const [duzenle, setDuzenle] = useState(false)",
        "const [duzenle, setDuzenle] = useState(false)\n  const [mobilDetayAcik, setMobilDetayAcik] = useState(false)",
        1
    )

# müşteri liste tıklaması: mobilde detay aç
s = s.replace(
    "onClick={() => setAktif(m)}",
    "onClick={() => { setAktif(m); setMobilDetayAcik(true); }}",
    1
)

# yeni müşteri butonlarına mobil panel kapanışı
s = s.replace(
    "setDuzenle(false)",
    "setDuzenle(false)\n    setMobilDetayAcik(false)",
    1
)

mobile_block = r'''
      {/* Mobil müşteri detay paneli */}
      {mobilDetayAcik && aktif && a && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 px-4 py-5 md:hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Müşteri Detayı</p>
              <h2 className="mt-1 text-xl font-black text-white">{musteriAdi(aktif)}</h2>
              <p className="mt-1 text-sm text-slate-400">{[aktif.telefon, aktif.email].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}</p>
            </div>
            <button
              onClick={() => setMobilDetayAcik(false)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white"
            >
              Kapat
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={duzenleAc}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white"
            >
              Düzenle
            </button>
            <button
              onClick={kaydet}
              className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950"
            >
              Kaydet
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bakiye</p>
            <p className="mt-2 text-2xl font-black text-white">{tl(a.bakiye)}</p>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Son İşler</p>
            <div className="mt-3 space-y-2">
              {(aktif.isler || []).slice(0, 6).map((i: any) => (
                <div key={i.id} className="rounded-2xl bg-slate-900/80 p-3">
                  <p className="font-semibold text-white">{i.isAdi || i.teklifNo || 'İş kaydı'}</p>
                  <p className="text-xs text-slate-400">{i.durum || 'Durum yok'}</p>
                </div>
              ))}
              {(aktif.isler || []).length === 0 && (
                <p className="text-sm text-slate-400">Henüz iş kaydı yok.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobil yeni müşteri butonu */}
      <button
        onClick={() => {
          setAktif(null)
          setDuzenle(false)
          setMobilDetayAcik(false)
        }}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 shadow-2xl md:hidden"
      >
        + Yeni Müşteri
      </button>
'''

# ekstre modalından hemen önce ekle
marker = "      {ekstreAcik && aktif && a && ("
if mobile_block not in s and marker in s:
    s = s.replace(marker, mobile_block + "\n" + marker, 1)

p.write_text(s)
PY

echo "3️⃣ Build testi..."
npm run build

echo ""
echo "✅ Mobil müşteriler sayfası güvenli şekilde düzeltildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000/dashboard/musteriler"
