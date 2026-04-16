'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const KULLANIM_KOSULLARI = `
METRIX ATÖLYE YÖNETİM SİSTEMİ KULLANIM KOŞULLARI

Son Güncelleme: Nisan 2026

1. HİZMET TANIMI
Metrix, tezgah atölyeleri için maliyet hesaplama ve teklif yönetimi hizmeti sunan bir yazılım platformudur.

2. ÜYELİK VE HESAP GÜVENLİĞİ
- Kayıt sırasında doğru ve güncel bilgi vermeyi kabul edersiniz.
- Hesap güvenliğinizden siz sorumlusunuz.
- Şifrenizi kimseyle paylaşmayınız.

3. ABONELİK VE ÖDEME
- Kayıt sonrası 30 gün ücretsiz deneme hakkı tanınır.
- Deneme süresi sonunda aylık abonelik ücreti ödenmesi gerekir.
- Ödeme yapılmayan hesaplar askıya alınır.

4. VERİ SORUMLULUĞU
- Sisteme girdiğiniz veriler size aittir.
- Verileriniz üçüncü şahıslarla paylaşılmaz.
- Hesabınızı silmeniz halinde tüm verileriniz kalıcı olarak silinir.

5. HİZMET KESİNTİLERİ
- Metrix, %99 uptime hedefler ancak bakım ve teknik arızalar nedeniyle kesinti yaşanabilir.
- Planlı bakımlar önceden duyurulur.

6. SORUMLULUK SINIRI
- Metrix, sisteme girilen verilerin doğruluğundan sorumlu değildir.
- Hesaplama sonuçları bilgi amaçlıdır.

7. SÖZLEŞMENİN FESHİ
- İstediğiniz zaman hesabınızı kapatabilirsiniz.
- Kullanım koşullarını ihlal eden hesaplar uyarısız kapatılabilir.

8. DEĞİŞİKLİKLER
- Metrix, kullanım koşullarını önceden bildirmeksizin değiştirme hakkını saklı tutar.
- Değişiklikler sitede yayınlandığı anda geçerli olur.
`

const KVKK_METNI = `
KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ

Veri Sorumlusu: Metrix Atölye Yönetim Sistemi

1. İŞLENEN KİŞİSEL VERİLER
- Ad ve soyad
- E-posta adresi
- Atölye/firma adı
- Sisteme girilen iş ve maliyet verileri

2. KİŞİSEL VERİLERİN İŞLENME AMACI
- Kullanıcı hesabının oluşturulması ve yönetilmesi
- Abonelik hizmetinin sağlanması
- Teknik destek ve iletişim
- Yasal yükümlülüklerin yerine getirilmesi

3. KİŞİSEL VERİLERİN AKTARIMI
Kişisel verileriniz; yasal zorunluluklar dışında üçüncü kişilerle paylaşılmamaktadır. Veriler, Avrupa Birliği'nde (Frankfurt, Almanya) barındırılan sunucularda saklanmaktadır.

4. KİŞİSEL VERİLERİN SAKLANMA SÜRESİ
Kişisel verileriniz hesabınız aktif olduğu sürece saklanır. Hesap kapatma talebinde tüm veriler 30 gün içinde silinir.

5. VERİ SAHİBİNİN HAKLARI
KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse buna ilişkin bilgi talep etme
- Verilerinizin düzeltilmesini isteme
- Verilerinizin silinmesini isteme
- İşlemenin kısıtlanmasını talep etme

6. İLETİŞİM
Haklarınızı kullanmak için: admin@metrix.com adresine başvurabilirsiniz.
`

export default function KayitOl() {
  const router = useRouter()
  const [form, setForm] = useState({ ad: '', email: '', password: '', passwordTekrar: '' })
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kullanikKosullari, setKullanikKosullari] = useState(false)
  const [kvkk, setKvkk] = useState(false)
  const [modal, setModal] = useState<null | 'kullanim' | 'kvkk'>(null)

  function guncelle(alan: string, deger: string) {
    setForm(prev => ({ ...prev, [alan]: deger }))
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault()
    setHata('')

    if (form.password !== form.passwordTekrar) {
      setHata('Şifreler eşleşmiyor.')
      return
    }

    if (!kullanikKosullari || !kvkk) {
      setHata('Kullanım koşullarını ve KVKK metnini onaylamanız gerekmektedir.')
      return
    }

    setYukleniyor(true)
    try {
      const yanit = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: form.ad, email: form.email, password: form.password }),
      })
      const veri = await yanit.json()
      if (yanit.ok) {
        router.push('/login?kayit=basarili')
      } else {
        setHata(veri.hata || 'Bir hata oluştu.')
      }
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      
      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {modal === 'kullanim' ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, fontSize: '13px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {modal === 'kullanim' ? KULLANIM_KOSULLARI : KVKK_METNI}
            </div>
            <button onClick={() => { if (modal === 'kullanim') setKullanikKosullari(true); else setKvkk(true); setModal(null) }} style={{ marginTop: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
              Okudum, Onaylıyorum
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '440px', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '700', color: '#111827' }}>Metrix</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Atölye Yönetim Sistemi</p>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#111827' }}>Hesap Oluştur</h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#6b7280' }}>30 gün ücretsiz deneme ile başla.</p>

        <form onSubmit={kayitOl}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Atölye / Firma Adı</label>
            <input style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} required value={form.ad} onChange={e => guncelle('ad', e.target.value)} placeholder="Atölye adınız" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>E-posta</label>
            <input type="email" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} required value={form.email} onChange={e => guncelle('email', e.target.value)} placeholder="ornek@email.com" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Şifre</label>
            <input type="password" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} required value={form.password} onChange={e => guncelle('password', e.target.value)} placeholder="En az 6 karakter" />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Şifre Tekrar</label>
            <input type="password" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} required value={form.passwordTekrar} onChange={e => guncelle('passwordTekrar', e.target.value)} placeholder="Şifrenizi tekrar girin" />
          </div>

          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input type="checkbox" id="kullanim" checked={kullanikKosullari} onChange={e => setKullanikKosullari(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
            <label htmlFor="kullanim" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer', lineHeight: '1.5' }}>
              <button type="button" onClick={() => setModal('kullanim')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}>Kullanım Koşullarını</button>
              {' '}okudum ve kabul ediyorum.
            </label>
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input type="checkbox" id="kvkk" checked={kvkk} onChange={e => setKvkk(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
            <label htmlFor="kvkk" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer', lineHeight: '1.5' }}>
              <button type="button" onClick={() => setModal('kvkk')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}>KVKK Aydınlatma Metnini</button>
              {' '}okudum ve onaylıyorum.
            </label>
          </div>

          {hata && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
              {hata}
            </div>
          )}

          <button type="submit" disabled={yukleniyor} style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>

          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
            Zaten hesabın var mı?{' '}
            <Link href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>Giriş Yap</Link>
          </p>
        </form>
      </div>
    </div>
  )
}