'use client'

import { useState, useEffect, useRef } from 'react'
import { paraGoster } from '@/lib/format'

const inputStil: React.CSSProperties = { width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 12px', fontSize:'14px', boxSizing:'border-box' }
const labelStil: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:'500', color:'#374151', marginBottom:'4px' }
const bolumStil: React.CSSProperties = { background:'white', borderRadius:'12px', padding:'24px', border:'1px solid #e5e7eb', marginBottom:'20px' }
const bolumBaslikStil: React.CSSProperties = { fontSize:'16px', fontWeight:'600', color:'#111827', margin:'0 0 20px', paddingBottom:'12px', borderBottom:'1px solid #f3f4f6' }
const gridStil: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px' }

type Makine = { id: string; makineAdi: string; alinanBedel: number; paraBirimi: string; amortismanSuresiAy: number; aylikAktifCalismaSaati: number; aylikAmortisman: number; saatlikMaliyet: number; dakikalikMaliyet: number }
type Arac = { id: string; aracAdi: string; aracTipi: string; alinanBedel: number; paraBirimi: string; amortismanSuresiAy: number; aylikBakim: number; aylikSigortaKasko: number; aylikVergiMuayene: number; aylikAmortisman: number; aylikToplamSabitMaliyet: number }

export default function AtolyeProfili() {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [dakikaMaliyeti, setDakikaMaliyeti] = useState<number>(0)
  const [toplamAylikGider, setToplamAylikGider] = useState<number>(0)
  const [gunlukGider, setGunlukGider] = useState<number>(0)
  const [makineler, setMakineler] = useState<Makine[]>([])
  const [araclar, setAraclar] = useState<Arac[]>([])
  const [yeniMakine, setYeniMakine] = useState({ makineAdi:'', alinanBedel:'', paraBirimi:'TRY', amortismanSuresiAy:'', aylikAktifCalismaSaati:'' })
  const [yeniArac, setYeniArac] = useState({ aracAdi:'', aracTipi:'Kamyonet', alinanBedel:'', paraBirimi:'TRY', amortismanSuresiAy:'', aylikBakim:'', aylikSigortaKasko:'', aylikVergiMuayene:'' })
  const [makineEkle, setMakineEkle] = useState(false)
  const [aracEkle, setAracEkle] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoYukleniyor, setLogoYukleniyor] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    atolyeAdi:'', sehir:'', ilce:'', telefon:'', email:'', adres:'',
    toplamMaas:'', sgkGideri:'', yemekGideri:'', yolGideri:'',
    kira:'', elektrik:'', su:'', dogalgaz:'', internet:'', sarfMalzeme:'',
    aylikPorselenPlaka:'', aylikKuvarsPlaka:'', aylikDogaltasPlaka:'', plakaBasinaMtul:'3.20',
    kdvOrani:'20', teklifGecerlilik:'15',
  })

  useEffect(() => {
    setYukleniyor(true)
    Promise.all([fetch('/api/atolye'), fetch('/api/makineler'), fetch('/api/araclar')])
      .then(async ([a, m, ar]) => {
        const av = await a.json()
        const mv = await m.json()
        const arv = await ar.json()
        if (av.atolye) {
          const a = av.atolye
          setForm({
            atolyeAdi:a.atolyeAdi||'', sehir:a.sehir||'', ilce:a.ilce||'',
            telefon:a.telefon||'', email:a.email||'', adres:a.adres||'',
            toplamMaas:a.toplamMaas?.toString()||'', sgkGideri:a.sgkGideri?.toString()||'',
            yemekGideri:a.yemekGideri?.toString()||'', yolGideri:a.yolGideri?.toString()||'',
            kira:a.kira?.toString()||'', elektrik:a.elektrik?.toString()||'',
            su:a.su?.toString()||'', dogalgaz:a.dogalgaz?.toString()||'',
            internet:a.internet?.toString()||'', sarfMalzeme:a.sarfMalzeme?.toString()||'',
            aylikPorselenPlaka:a.aylikPorselenPlaka?.toString()||'',
            aylikKuvarsPlaka:a.aylikKuvarsPlaka?.toString()||'',
            aylikDogaltasPlaka:a.aylikDogaltasPlaka?.toString()||'',
            plakaBasinaMtul:a.plakaBasinaMtul?.toString()||'3.20',
            kdvOrani:a.kdvOrani?.toString()||'20',
            teklifGecerlilik:a.teklifGecerlilik?.toString()||'15',
          })
          setLogoUrl(a.logoUrl||'')
        }
        if (av.toplamAylikGider !== undefined) setToplamAylikGider(Number(av.toplamAylikGider))
        if (av.dakikaMaliyeti !== undefined) setDakikaMaliyeti(Number(av.dakikaMaliyeti))
        if (av.gunlukGider !== undefined) setGunlukGider(Number(av.gunlukGider))
        if (mv.makineler) setMakineler(mv.makineler)
        if (arv.araclar) setAraclar(arv.araclar)
      })
      .finally(() => setYukleniyor(false))
  }, [])

  function guncelle(alan: string, deger: string) { setForm(prev => ({ ...prev, [alan]: deger })) }

  async function logoYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    setLogoYukleniyor(true)
    const formData = new FormData()
    formData.append('logo', dosya)
    try {
      const yanit = await fetch('/api/logo', { method: 'POST', body: formData })
      const veri = await yanit.json()
      if (veri.logoUrl) setLogoUrl(veri.logoUrl)
    } finally { setLogoYukleniyor(false) }
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setMesaj('')
    try {
      const yanit = await fetch('/api/atolye', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          atolyeAdi:form.atolyeAdi, sehir:form.sehir, ilce:form.ilce,
          telefon:form.telefon, email:form.email, adres:form.adres,
          toplamMaas:parseFloat(form.toplamMaas)||0, sgkGideri:parseFloat(form.sgkGideri)||0,
          yemekGideri:parseFloat(form.yemekGideri)||0, yolGideri:parseFloat(form.yolGideri)||0,
          kira:parseFloat(form.kira)||0, elektrik:parseFloat(form.elektrik)||0,
          su:parseFloat(form.su)||0, dogalgaz:parseFloat(form.dogalgaz)||0,
          internet:parseFloat(form.internet)||0, sarfMalzeme:parseFloat(form.sarfMalzeme)||0,
          aylikPorselenPlaka:parseInt(form.aylikPorselenPlaka)||0,
          aylikKuvarsPlaka:parseInt(form.aylikKuvarsPlaka)||0,
          aylikDogaltasPlaka:parseInt(form.aylikDogaltasPlaka)||0,
          plakaBasinaMtul:parseFloat(form.plakaBasinaMtul)||3.20,
          kdvOrani:parseInt(form.kdvOrani)||20,
          teklifGecerlilik:parseInt(form.teklifGecerlilik)||15,
        })
      })
      if (yanit.ok) {
        const sonuc = await yanit.json()
        setDakikaMaliyeti(Number(sonuc.dakikaMaliyeti) || 0)
        setToplamAylikGider(Number(sonuc.toplamAylikGider) || 0)
        setGunlukGider(Number(sonuc.gunlukGider) || 0)
        setMesaj('Kaydedildi!')
      } else { setMesaj('Hata oluştu.') }
    } finally { setKaydediliyor(false) }
  }

  async function makineKaydet() {
    const yanit = await fetch('/api/makineler', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ makineAdi:yeniMakine.makineAdi, alinanBedel:parseFloat(yeniMakine.alinanBedel)||0, paraBirimi:yeniMakine.paraBirimi, amortismanSuresiAy:parseInt(yeniMakine.amortismanSuresiAy)||0, aylikAktifCalismaSaati:parseFloat(yeniMakine.aylikAktifCalismaSaati)||0 }) })
    const veri = await yanit.json()
    if (veri.makine) { setMakineler(prev => [...prev, veri.makine]); setYeniMakine({ makineAdi:'', alinanBedel:'', paraBirimi:'TRY', amortismanSuresiAy:'', aylikAktifCalismaSaati:'' }); setMakineEkle(false) }
  }

  async function makineSil(id: string) {
    await fetch('/api/makineler', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    setMakineler(prev => prev.filter(m => m.id !== id))
  }

  async function aracKaydet() {
    const yanit = await fetch('/api/araclar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ aracAdi:yeniArac.aracAdi, aracTipi:yeniArac.aracTipi, alinanBedel:parseFloat(yeniArac.alinanBedel)||0, paraBirimi:yeniArac.paraBirimi, amortismanSuresiAy:parseInt(yeniArac.amortismanSuresiAy)||0, aylikBakim:parseFloat(yeniArac.aylikBakim)||0, aylikSigortaKasko:parseFloat(yeniArac.aylikSigortaKasko)||0, aylikVergiMuayene:parseFloat(yeniArac.aylikVergiMuayene)||0 }) })
    const veri = await yanit.json()
    if (veri.arac) { setAraclar(prev => [...prev, veri.arac]); setYeniArac({ aracAdi:'', aracTipi:'Kamyonet', alinanBedel:'', paraBirimi:'TRY', amortismanSuresiAy:'', aylikBakim:'', aylikSigortaKasko:'', aylikVergiMuayene:'' }); setAracEkle(false) }
  }

  async function aracSil(id: string) {
    await fetch('/api/araclar', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    setAraclar(prev => prev.filter(a => a.id !== id))
  }

  if (yukleniyor) return <div style={{padding:'32px'}}>Yükleniyor...</div>

  return (
    <div style={{padding:'32px', maxWidth:'900px'}}>
      <h2 style={{margin:'0 0 24px', fontSize:'24px', fontWeight:'600', color:'#111827'}}>Atölye Profili</h2>

      <div style={{background:'#eff6ff', borderRadius:'12px', padding:'16px 24px', border:'1px solid #bfdbfe', marginBottom:'24px', display:'flex', gap:'32px', flexWrap:'wrap'}}>
        <div>
          <p style={{margin:'0 0 4px', fontSize:'12px', color:'#3b82f6', fontWeight:'500'}}>TOPLAM AYLIK GİDER</p>
          <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#1e40af'}}>{paraGoster(toplamAylikGider)}</p>
        </div>
        <div>
          <p style={{margin:'0 0 4px', fontSize:'12px', color:'#3b82f6', fontWeight:'500'}}>DAKİKA MALİYETİ</p>
          <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#1e40af'}}>{paraGoster(dakikaMaliyeti, 4)}</p>
          </div>
          <div style={{background:'white', borderRadius:'12px', padding:'20px', border:'1px solid #e5e7eb', textAlign:'center'}}>
            <p style={{margin:'0 0 4px', fontSize:'13px', color:'#6b7280', fontWeight:'500'}}>GÜNLÜK GİDER (26 İş Günü)</p>
            <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#7c3aed'}}>{paraGoster(gunlukGider)}</p>
        </div>
      </div>

      {/* Logo Yükleme */}
      <div style={bolumStil}>
        <h3 style={bolumBaslikStil}>Firma Logosu</h3>
        <div style={{display:'flex', alignItems:'center', gap:'24px', flexWrap:'wrap'}}>
          {logoUrl ? (
            <img src={logoUrl} alt="Firma logosu" style={{height:'80px', objectFit:'contain', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'8px'}} />
          ) : (
            <div style={{width:'120px', height:'80px', border:'2px dashed #d1d5db', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:'13px'}}>
              Logo yok
            </div>
          )}
          <div>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={logoYukle} style={{display:'none'}} />
            <button onClick={() => logoInputRef.current?.click()} disabled={logoYukleniyor} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', cursor:'pointer'}}>
              {logoYukleniyor ? 'Yükleniyor...' : logoUrl ? 'Logoyu Değiştir' : 'Logo Yükle'}
            </button>
            <p style={{margin:'8px 0 0', fontSize:'12px', color:'#9ca3af'}}>PNG, JPG — max 2MB</p>
          </div>
        </div>
      </div>

      <form onSubmit={kaydet}>
        <div style={bolumStil}>
          <h3 style={bolumBaslikStil}>Firma Bilgileri</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Atölye Adı</label><input style={inputStil} value={form.atolyeAdi} onChange={e => guncelle('atolyeAdi', e.target.value)} /></div>
            <div><label style={labelStil}>Şehir</label><input style={inputStil} value={form.sehir} onChange={e => guncelle('sehir', e.target.value)} /></div>
            <div><label style={labelStil}>İlçe</label><input style={inputStil} value={form.ilce} onChange={e => guncelle('ilce', e.target.value)} /></div>
            <div><label style={labelStil}>Telefon</label><input style={inputStil} value={form.telefon} onChange={e => guncelle('telefon', e.target.value)} /></div>
            <div><label style={labelStil}>E-posta</label><input style={inputStil} type="email" value={form.email} onChange={e => guncelle('email', e.target.value)} /></div>
            <div style={{gridColumn:'1/-1'}}><label style={labelStil}>Adres</label><input style={inputStil} value={form.adres} onChange={e => guncelle('adres', e.target.value)} /></div>
          </div>
        </div>

        <div style={bolumStil}>
          <h3 style={bolumBaslikStil}>Teklif Ayarları</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>KDV Oranı (%)</label><input style={inputStil} type="number" value={form.kdvOrani} onChange={e => guncelle('kdvOrani', e.target.value)} /></div>
            <div><label style={labelStil}>Teklif Geçerlilik Süresi (gün)</label><input style={inputStil} type="number" value={form.teklifGecerlilik} onChange={e => guncelle('teklifGecerlilik', e.target.value)} /></div>
          </div>
        </div>

        <div style={bolumStil}>
          <h3 style={bolumBaslikStil}>Personel Giderleri (TL/ay)</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Toplam Maaş</label><input style={inputStil} type="number" value={form.toplamMaas} onChange={e => guncelle('toplamMaas', e.target.value)} /></div>
            <div><label style={labelStil}>SGK Gideri</label><input style={inputStil} type="number" value={form.sgkGideri} onChange={e => guncelle('sgkGideri', e.target.value)} /></div>
            <div><label style={labelStil}>Yemek Gideri</label><input style={inputStil} type="number" value={form.yemekGideri} onChange={e => guncelle('yemekGideri', e.target.value)} /></div>
            <div><label style={labelStil}>Yol Gideri</label><input style={inputStil} type="number" value={form.yolGideri} onChange={e => guncelle('yolGideri', e.target.value)} /></div>
          </div>
        </div>

        <div style={bolumStil}>
          <h3 style={bolumBaslikStil}>Sabit Giderler (TL/ay)</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Kira</label><input style={inputStil} type="number" value={form.kira} onChange={e => guncelle('kira', e.target.value)} /></div>
            <div><label style={labelStil}>Elektrik</label><input style={inputStil} type="number" value={form.elektrik} onChange={e => guncelle('elektrik', e.target.value)} /></div>
            <div><label style={labelStil}>Su</label><input style={inputStil} type="number" value={form.su} onChange={e => guncelle('su', e.target.value)} /></div>
            <div><label style={labelStil}>Doğalgaz</label><input style={inputStil} type="number" value={form.dogalgaz} onChange={e => guncelle('dogalgaz', e.target.value)} /></div>
            <div><label style={labelStil}>İnternet</label><input style={inputStil} type="number" value={form.internet} onChange={e => guncelle('internet', e.target.value)} /></div>
            <div><label style={labelStil}>Sarf Malzeme</label><input style={inputStil} type="number" value={form.sarfMalzeme} onChange={e => guncelle('sarfMalzeme', e.target.value)} /></div>
          </div>
        </div>

        <div style={bolumStil}>
          <h3 style={bolumBaslikStil}>Aylık Kapasite</h3>
          <div style={gridStil}>
            <div><label style={labelStil}>Porselen Plaka (adet/ay)</label><input style={inputStil} type="number" value={form.aylikPorselenPlaka} onChange={e => guncelle('aylikPorselenPlaka', e.target.value)} /></div>
            <div><label style={labelStil}>Kuvars Plaka (adet/ay)</label><input style={inputStil} type="number" value={form.aylikKuvarsPlaka} onChange={e => guncelle('aylikKuvarsPlaka', e.target.value)} /></div>
            <div><label style={labelStil}>Doğaltaş Plaka (adet/ay)</label><input style={inputStil} type="number" value={form.aylikDogaltasPlaka} onChange={e => guncelle('aylikDogaltasPlaka', e.target.value)} /></div>
            <div><label style={labelStil}>Plaka Başına Metraj (mtül)</label><input style={inputStil} type="number" step="0.01" value={form.plakaBasinaMtul} onChange={e => guncelle('plakaBasinaMtul', e.target.value)} /></div>
          </div>
        </div>

        {mesaj && <div style={{background:mesaj==='Kaydedildi!'?'#f0fdf4':'#fef2f2', border:`1px solid ${mesaj==='Kaydedildi!'?'#bbf7d0':'#fecaca'}`, color:mesaj==='Kaydedildi!'?'#16a34a':'#dc2626', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>{mesaj}</div>}
        <button type="submit" disabled={kaydediliyor} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'12px 32px', fontSize:'15px', fontWeight:'500', cursor:'pointer', marginBottom:'32px'}}>
          {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>

      <div style={bolumStil}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h3 style={{...bolumBaslikStil, margin:0, border:'none', padding:0}}>Makine Parkı</h3>
          <button onClick={() => setMakineEkle(true)} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'8px 16px', fontSize:'13px', cursor:'pointer'}}>+ Makine Ekle</button>
        </div>
        {makineler.length === 0 && <p style={{color:'#9ca3af', fontSize:'14px'}}>Henüz makine eklenmedi.</p>}
        {makineler.map(m => (
          <div key={m.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f9fafb', borderRadius:'8px', marginBottom:'8px'}}>
            <div>
              <p style={{margin:0, fontWeight:'500', fontSize:'14px'}}>{m.makineAdi}</p>
              <p style={{margin:'4px 0 0', fontSize:'12px', color:'#6b7280'}}>
                Aylık amortisman: {paraGoster(Number(m.aylikAmortisman))} | Dakika maliyeti: {paraGoster(Number(m.dakikalikMaliyet), 4)}
              </p>
            </div>
            <button onClick={() => makineSil(m.id)} style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer'}}>Sil</button>
          </div>
        ))}
        {makineEkle && (
          <div style={{background:'#f0f9ff', borderRadius:'10px', padding:'20px', marginTop:'16px', border:'1px solid #bae6fd'}}>
            <h4 style={{margin:'0 0 16px', fontSize:'14px', fontWeight:'600'}}>Yeni Makine</h4>
            <div style={gridStil}>
              <div><label style={labelStil}>Makine Adı</label><input style={inputStil} value={yeniMakine.makineAdi} onChange={e => setYeniMakine(p => ({...p, makineAdi:e.target.value}))} /></div>
              <div><label style={labelStil}>Alınan Bedel</label><input style={inputStil} type="number" value={yeniMakine.alinanBedel} onChange={e => setYeniMakine(p => ({...p, alinanBedel:e.target.value}))} /></div>
              <div><label style={labelStil}>Para Birimi</label>
                <select style={inputStil} value={yeniMakine.paraBirimi} onChange={e => setYeniMakine(p => ({...p, paraBirimi:e.target.value}))}>
                  <option>TRY</option><option>EUR</option><option>USD</option>
                </select>
              </div>
              <div><label style={labelStil}>Amortisman (ay)</label><input style={inputStil} type="number" value={yeniMakine.amortismanSuresiAy} onChange={e => setYeniMakine(p => ({...p, amortismanSuresiAy:e.target.value}))} /></div>
              <div><label style={labelStil}>Aylık Aktif Çalışma (saat)</label><input style={inputStil} type="number" value={yeniMakine.aylikAktifCalismaSaati} onChange={e => setYeniMakine(p => ({...p, aylikAktifCalismaSaati:e.target.value}))} /></div>
            </div>
            <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
              <button onClick={makineKaydet} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'8px 20px', fontSize:'14px', cursor:'pointer'}}>Kaydet</button>
              <button onClick={() => setMakineEkle(false)} style={{background:'white', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 20px', fontSize:'14px', cursor:'pointer'}}>İptal</button>
            </div>
          </div>
        )}
      </div>

      <div style={bolumStil}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h3 style={{...bolumBaslikStil, margin:0, border:'none', padding:0}}>Araç Filosu</h3>
          <button onClick={() => setAracEkle(true)} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'8px 16px', fontSize:'13px', cursor:'pointer'}}>+ Araç Ekle</button>
        </div>
        {araclar.length === 0 && <p style={{color:'#9ca3af', fontSize:'14px'}}>Henüz araç eklenmedi.</p>}
        {araclar.map(a => (
          <div key={a.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f9fafb', borderRadius:'8px', marginBottom:'8px'}}>
            <div>
              <p style={{margin:0, fontWeight:'500', fontSize:'14px'}}>{a.aracAdi} — {a.aracTipi}</p>
              <p style={{margin:'4px 0 0', fontSize:'12px', color:'#6b7280'}}>
                Aylık amortisman: {paraGoster(Number(a.aylikAmortisman))} | Aylık toplam: {paraGoster(Number(a.aylikToplamSabitMaliyet))}
              </p>
            </div>
            <button onClick={() => aracSil(a.id)} style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer'}}>Sil</button>
          </div>
        ))}
        {aracEkle && (
          <div style={{background:'#f0f9ff', borderRadius:'10px', padding:'20px', marginTop:'16px', border:'1px solid #bae6fd'}}>
            <h4 style={{margin:'0 0 16px', fontSize:'14px', fontWeight:'600'}}>Yeni Araç</h4>
            <div style={gridStil}>
              <div><label style={labelStil}>Araç Adı / Modeli</label><input style={inputStil} value={yeniArac.aracAdi} onChange={e => setYeniArac(p => ({...p, aracAdi:e.target.value}))} /></div>
              <div><label style={labelStil}>Araç Tipi</label>
                <select style={inputStil} value={yeniArac.aracTipi} onChange={e => setYeniArac(p => ({...p, aracTipi:e.target.value}))}>
                  <option>Kamyon</option><option>Kamyonet</option><option>Binek</option><option>Diğer</option>
                </select>
              </div>
              <div><label style={labelStil}>Alınan Bedel</label><input style={inputStil} type="number" value={yeniArac.alinanBedel} onChange={e => setYeniArac(p => ({...p, alinanBedel:e.target.value}))} /></div>
              <div><label style={labelStil}>Para Birimi</label>
                <select style={inputStil} value={yeniArac.paraBirimi} onChange={e => setYeniArac(p => ({...p, paraBirimi:e.target.value}))}>
                  <option>TRY</option><option>EUR</option><option>USD</option>
                </select>
              </div>
              <div><label style={labelStil}>Amortisman (ay)</label><input style={inputStil} type="number" value={yeniArac.amortismanSuresiAy} onChange={e => setYeniArac(p => ({...p, amortismanSuresiAy:e.target.value}))} /></div>
              <div><label style={labelStil}>Aylık Bakım (TL)</label><input style={inputStil} type="number" value={yeniArac.aylikBakim} onChange={e => setYeniArac(p => ({...p, aylikBakim:e.target.value}))} /></div>
              <div><label style={labelStil}>Aylık Sigorta/Kasko (TL)</label><input style={inputStil} type="number" value={yeniArac.aylikSigortaKasko} onChange={e => setYeniArac(p => ({...p, aylikSigortaKasko:e.target.value}))} /></div>
              <div><label style={labelStil}>Aylık Vergi/Muayene (TL)</label><input style={inputStil} type="number" value={yeniArac.aylikVergiMuayene} onChange={e => setYeniArac(p => ({...p, aylikVergiMuayene:e.target.value}))} /></div>
            </div>
            <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
              <button onClick={aracKaydet} style={{background:'#2563eb', color:'white', border:'none', borderRadius:'8px', padding:'8px 20px', fontSize:'14px', cursor:'pointer'}}>Kaydet</button>
              <button onClick={() => setAracEkle(false)} style={{background:'white', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 20px', fontSize:'14px', cursor:'pointer'}}>İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}