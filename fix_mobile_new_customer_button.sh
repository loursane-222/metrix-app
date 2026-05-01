#!/bin/bash
set -e

FILE="src/app/dashboard/musteriler/page.tsx"

echo "1️⃣ Mobil yeni müşteri modal state ekleniyor..."

python3 <<'PY'
from pathlib import Path

p = Path("src/app/dashboard/musteriler/page.tsx")
s = p.read_text()

if "mobilYeniAcik" not in s:
    s = s.replace(
        "const [mobilDetayAcik, setMobilDetayAcik] = useState(false)",
        "const [mobilDetayAcik, setMobilDetayAcik] = useState(false)\n  const [mobilYeniAcik, setMobilYeniAcik] = useState(false)",
        1
    )

# Floating yeni müşteri butonunu çalışır hale getir
s = s.replace(
'''        onClick={() => {
          setAktif(null)
          setDuzenle(false)
          setMobilDetayAcik(false)
        }}''',
'''        onClick={() => {
          setAktif(null)
          setDuzenle(false)
          setMobilDetayAcik(false)
          setMobilYeniAcik(true)
          setForm({
            firmaAdi: '',
            ad: '',
            soyad: '',
            telefon: '',
            email: '',
            acilisBakiyesi: '',
            bakiyeTipi: 'borc',
          })
        }}''',
1
)

mobile_new_modal = r'''
      {/* Mobil yeni müşteri modalı */}
      {mobilYeniAcik && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 px-4 py-5 md:hidden">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Yeni Kayıt</p>
              <h2 className="mt-1 text-xl font-black text-white">Yeni Müşteri</h2>
            </div>
            <button
              onClick={() => setMobilYeniAcik(false)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-white"
            >
              Kapat
            </button>
          </div>

          <div className="space-y-3">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Firma adı" value={form.firmaAdi || ''} onChange={(e) => setForm({ ...form, firmaAdi: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Ad" value={form.ad || ''} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Soyad" value={form.soyad || ''} onChange={(e) => setForm({ ...form, soyad: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Telefon" value={form.telefon || ''} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="E-posta" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Açılış bakiyesi" value={form.acilisBakiyesi || ''} onChange={(e) => setForm({ ...form, acilisBakiyesi: e.target.value })} />

            <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" value={form.bakiyeTipi || 'borc'} onChange={(e) => setForm({ ...form, bakiyeTipi: e.target.value })}>
              <option value="borc">Borç</option>
              <option value="alacak">Alacak</option>
            </select>

            <button
              onClick={async () => {
                await kaydet()
                setMobilYeniAcik(false)
              }}
              className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-4 font-black text-slate-950"
            >
              Müşteri Oluştur
            </button>
          </div>
        </div>
      )}
'''

marker = "      {/* Mobil müşteri detay paneli */}"
if mobile_new_modal not in s and marker in s:
    s = s.replace(marker, mobile_new_modal + "\n" + marker, 1)

p.write_text(s)
PY

echo "2️⃣ Build testi..."
npm run build

echo ""
echo "✅ Mobil yeni müşteri butonu çalışır hale getirildi."
echo ""
echo "Local çalıştır:"
echo "cd ~/Desktop/metrix2 && npm run dev"
echo ""
echo "Link:"
echo "http://localhost:3000/dashboard/musteriler"
