"use client";

import { useState, useRef } from "react";

const YON_SECENEKLERI = ["Enine", "Boyuna", "Serbest"];
const SABIT_ALANLAR = ["Ön Alın","Tezgah","Tezgah Arası","L Tezgah Dönüş","Ada","Ada Tezgah Ayak","Ada Tezgah Ayak Kalınlığı"];
const RENKLER = ["#2563eb","#d97706","#059669","#dc2626","#7c3aed","#0891b2","#ea580c","#65a30d","#db2777","#4f46e5"];

interface KesimDetay { en: string; boy: string; yon: string; }
interface KesimAlani { id: string; baslik: string; detay: KesimDetay; aktif: boolean; sira: number; }
interface UrunBilgisi { urunAdi: string; marka: string; yuzey: string; tipAdi: string; toplamAdet: string; plakaEni: string; plakaBoy: string; gorselUrl: string | null; }
interface Parca { id: string; baslik: string; en: number; boy: number; }
interface YerlesilenParca { id: string; baslik: string; x: number; y: number; en: number; boy: number; renk: string; }

const bos: KesimDetay = { en: "", boy: "", yon: "Serbest" };

export function PlakaPlanlayici() {
  const [urun, setUrun] = useState<UrunBilgisi>({ urunAdi:"", marka:"", yuzey:"", tipAdi:"", toplamAdet:"1", plakaEni:"", plakaBoy:"", gorselUrl:null });
  const [sabitAlanlar, setSabitAlanlar] = useState<KesimAlani[]>(SABIT_ALANLAR.map((b,i) => ({ id:`sabit-${i}`, baslik:b, detay:{...bos}, aktif:false, sira:i })));
  const [ozelAlanlar, setOzelAlanlar] = useState<KesimAlani[]>(Array.from({length:5},(_,i) => ({ id:`ozel-${i}`, baslik:"", detay:{...bos}, aktif:false, sira:100+i })));
  const [modalAcik, setModalAcik] = useState(false);
  const [aktifTip, setAktifTip] = useState<"sabit"|"ozel">("sabit");
  const [aktifIndex, setAktifIndex] = useState(0);
  const [geciciDetay, setGeciciDetay] = useState<KesimDetay>({...bos});
  const [plakalar, setPlakalar] = useState<YerlesilenParca[][]>([]);
  const [uyari, setUyari] = useState<string[]>([]);
  const [hesaplandi, setHesaplandi] = useState(false);
  const [fireOrani, setFireOrani] = useState(0);
  const [toplamPlakaAdet, setToplamPlakaAdet] = useState(0);
  const gorselRef = useRef<HTMLInputElement>(null);

  function modalAc(tip:"sabit"|"ozel", index:number) {
    const alan = tip==="sabit" ? sabitAlanlar[index] : ozelAlanlar[index];
    setAktifTip(tip); setAktifIndex(index); setGeciciDetay({...alan.detay}); setModalAcik(true);
  }

  function modalKaydet() {
    if (aktifTip==="sabit") {
      setSabitAlanlar(prev => { const y=[...prev]; y[aktifIndex]={...y[aktifIndex], detay:geciciDetay, aktif:!!(geciciDetay.en&&geciciDetay.boy)}; return y; });
    } else {
      setOzelAlanlar(prev => { const y=[...prev]; y[aktifIndex]={...y[aktifIndex], detay:geciciDetay, aktif:!!(geciciDetay.en&&geciciDetay.boy)}; return y; });
    }
    setModalAcik(false);
  }

  function gorselYukle(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return;
    setUrun(prev=>({...prev, gorselUrl:URL.createObjectURL(file)}));
  }

  function hesapla() {
    setUyari([]); setHesaplandi(false); setPlakalar([]);
    const plakaEni = parseFloat(urun.plakaEni);
    const plakaBoy = parseFloat(urun.plakaBoy);
    const adet = Math.max(1, parseInt(urun.toplamAdet)||1);

    if (!plakaEni||!plakaBoy) { setUyari(["Plaka eni ve boyu girilmeden hesaplama yapılamaz."]); return; }

    const aktifAlanlar = [...sabitAlanlar,...ozelAlanlar]
      .filter(a => a.aktif && parseFloat(a.detay.en)>0 && parseFloat(a.detay.boy)>0)
      .sort((a,b) => a.sira-b.sira);

    if (aktifAlanlar.length===0) { setUyari(["Hiç kesim alanı girilmedi."]); return; }

    // Her tip için parçaları oluştur
    const tumParcalar: Parca[] = [];
    for (let tipNo=1; tipNo<=adet; tipNo++) {
      for (const alan of aktifAlanlar) {
        tumParcalar.push({
          id: `t${tipNo}_${alan.id}`,
          baslik: adet>1 ? `${alan.baslik} (${tipNo})` : alan.baslik,
          en: parseFloat(alan.detay.en),
          boy: parseFloat(alan.detay.boy),
        });
      }
    }

    // Plaka plaka yerleştir
    const tumPlakalar: YerlesilenParca[][] = [];
    let bekleyenler = [...tumParcalar];
    const uyarilar: string[] = [];

    while (bekleyenler.length>0 && tumPlakalar.length<50) {
      let mevcutX=0, mevcutY=0, satirY=0;
      const buPlaka: YerlesilenParca[] = [];
      const yerlestirildi = new Set<string>();

      for (const parca of bekleyenler) {
        const renkIdx = tumParcalar.findIndex(p=>p.id===parca.id) % RENKLER.length;
        const renk = RENKLER[renkIdx];
        if (parca.en>plakaEni || parca.boy>plakaBoy) continue;
        if (mevcutX+parca.en>plakaEni) { mevcutX=0; mevcutY=satirY; }
        if (mevcutY+parca.boy>plakaBoy) continue;
        buPlaka.push({ id:parca.id, baslik:parca.baslik, x:mevcutX, y:mevcutY, en:parca.en, boy:parca.boy, renk });
        yerlestirildi.add(parca.id);
        mevcutX += parca.en;
        if (mevcutY+parca.boy>satirY) satirY=mevcutY+parca.boy;
      }

      if (buPlaka.length===0) {
        bekleyenler.forEach(p => uyarilar.push(`"${p.baslik}" plakaya sığmıyor.`));
        break;
      }

      tumPlakalar.push(buPlaka);
      bekleyenler = bekleyenler.filter(p => !yerlestirildi.has(p.id));
    }

    const toplamCm2 = tumPlakalar.length * plakaEni * plakaBoy;
    const kullanilanCm2 = tumPlakalar.flat().reduce((a,p)=>a+p.en*p.boy,0);
    const fire = toplamCm2>0 ? ((toplamCm2-kullanilanCm2)/toplamCm2)*100 : 0;
    try { localStorage.setItem("metrix_fire_orani", fire.toFixed(1)); } catch {}

    setPlakalar(tumPlakalar);
    setFireOrani(fire);
    setToplamPlakaAdet(tumPlakalar.length);
    setUyari(uyarilar);
    setHesaplandi(true);
  }

  const plakaEni = parseFloat(urun.plakaEni)||0;
  const plakaBoy = parseFloat(urun.plakaBoy)||0;
  const CANVAS_EN = 540;
  const CANVAS_BOY = plakaEni>0&&plakaBoy>0 ? Math.round(CANVAS_EN*(plakaBoy/plakaEni)) : 280;
  const olcek = plakaEni>0 ? CANVAS_EN/plakaEni : 1;

  return (
    <div style={{padding:"24px",maxWidth:"1100px",margin:"0 auto",fontFamily:"sans-serif"}}>
      <h1 style={{fontSize:"22px",fontWeight:"700",marginBottom:"4px"}}>Plaka Yerleşim Planlayıcı</h1>
      <p style={{fontSize:"14px",color:"#6b7280",marginBottom:"24px"}}>Kesim ölçülerini girin, fire oranını hesaplayın.</p>

      {/* Ürün Bilgisi */}
      <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
        <h2 style={{fontSize:"15px",fontWeight:"600",marginBottom:"14px"}}>Ürün Bilgisi</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px"}}>
          {[
            {label:"Ürün Adı",key:"urunAdi",tip:"text"},
            {label:"Marka",key:"marka",tip:"text"},
            {label:"Yüzey",key:"yuzey",tip:"text"},
            {label:"Tip Adı",key:"tipAdi",tip:"text"},
            {label:"Toplam Tip Adeti",key:"toplamAdet",tip:"number"},
            {label:"Plaka Eni (cm)",key:"plakaEni",tip:"number"},
            {label:"Plaka Boyu (cm)",key:"plakaBoy",tip:"number"},
          ].map(({label,key,tip}) => (
            <div key={key}>
              <label style={{fontSize:"11px",color:"#6b7280",display:"block",marginBottom:"4px"}}>{label}</label>
              <input type={tip} value={(urun as any)[key]} onChange={e=>setUrun(prev=>({...prev,[key]:e.target.value}))}
                style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"7px 10px",fontSize:"13px",boxSizing:"border-box"}} />
            </div>
          ))}
        </div>
        <div style={{marginTop:"14px"}}>
          <label style={{fontSize:"11px",color:"#6b7280",display:"block",marginBottom:"6px"}}>Plaka Görseli</label>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <button onClick={()=>gorselRef.current?.click()}
              style={{padding:"7px 14px",border:"1px dashed #d1d5db",borderRadius:"8px",background:"#f9fafb",cursor:"pointer",fontSize:"12px",color:"#6b7280"}}>
              📁 Görsel Yükle
            </button>
            {urun.gorselUrl && <img src={urun.gorselUrl} alt="plaka" style={{height:"44px",width:"88px",objectFit:"cover",borderRadius:"6px",border:"1px solid #e5e7eb"}} />}
            <input ref={gorselRef} type="file" accept="image/*" style={{display:"none"}} onChange={gorselYukle} />
          </div>
        </div>
      </div>

      {/* Sabit Kesim Alanları */}
      <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
        <h2 style={{fontSize:"15px",fontWeight:"600",marginBottom:"14px"}}>Sabit Kesim Alanları</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"10px"}}>
          {sabitAlanlar.map((alan,i) => (
            <div key={alan.id} style={{border:`1px solid ${alan.aktif?RENKLER[i%RENKLER.length]:"#e5e7eb"}`,borderRadius:"10px",padding:"12px",background:alan.aktif?RENKLER[i%RENKLER.length]+"11":"#f9fafb"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                <span style={{fontSize:"12px",fontWeight:"600",color:"#374151"}}>{alan.baslik}</span>
                {alan.aktif && <span style={{width:"8px",height:"8px",borderRadius:"50%",background:RENKLER[i%RENKLER.length],display:"inline-block"}} />}
              </div>
              {alan.aktif && <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"6px"}}>{alan.detay.en} × {alan.detay.boy} cm · {alan.detay.yon}</div>}
              <button onClick={()=>modalAc("sabit",i)}
                style={{width:"100%",padding:"5px",border:"1px solid #e5e7eb",borderRadius:"6px",background:"white",cursor:"pointer",fontSize:"11px",color:"#374151"}}>
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Özel Alanlar */}
      <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
        <h2 style={{fontSize:"15px",fontWeight:"600",marginBottom:"14px"}}>Diğer Kesim Ölçüleri</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"10px"}}>
          {ozelAlanlar.map((alan,i) => (
            <div key={alan.id} style={{border:`1px solid ${alan.aktif?RENKLER[(SABIT_ALANLAR.length+i)%RENKLER.length]:"#e5e7eb"}`,borderRadius:"10px",padding:"12px",background:alan.aktif?RENKLER[(SABIT_ALANLAR.length+i)%RENKLER.length]+"11":"#f9fafb"}}>
              <input type="text" placeholder={`Özel Alan ${i+1}`} value={alan.baslik}
                onChange={e=>setOzelAlanlar(prev=>{const y=[...prev];y[i]={...y[i],baslik:e.target.value};return y;})}
                style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:"6px",padding:"5px 8px",fontSize:"12px",marginBottom:"6px",boxSizing:"border-box"}} />
              {alan.aktif && <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"6px"}}>{alan.detay.en} × {alan.detay.boy} cm · {alan.detay.yon}</div>}
              <button onClick={()=>modalAc("ozel",i)}
                style={{width:"100%",padding:"5px",border:"1px solid #e5e7eb",borderRadius:"6px",background:"white",cursor:"pointer",fontSize:"11px",color:"#374151"}}>
                ✏ Detay Gir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hesapla */}
      <div style={{textAlign:"center",marginBottom:"24px"}}>
        <button onClick={hesapla}
          style={{padding:"12px 40px",background:"#1d4ed8",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"600",cursor:"pointer"}}>
          🔲 Yerleşimi Hesapla
        </button>
      </div>

      {uyari.length>0 && (
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:"10px",padding:"12px 16px",marginBottom:"20px"}}>
          {uyari.map((u,i)=><div key={i} style={{fontSize:"13px",color:"#92400e"}}>⚠ {u}</div>)}
        </div>
      )}

      {hesaplandi && (
        <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"20px"}}>
          <h2 style={{fontSize:"15px",fontWeight:"600",marginBottom:"16px"}}>Sonuç</h2>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"12px",marginBottom:"20px"}}>
            <div style={{background:"#eff6ff",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#6b7280"}}>Toplam Plaka</div>
              <div style={{fontSize:"24px",fontWeight:"700",color:"#1d4ed8"}}>{toplamPlakaAdet} adet</div>
            </div>
            <div style={{background:"#fef2f2",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#6b7280"}}>Ortalama Fire</div>
              <div style={{fontSize:"24px",fontWeight:"700",color:"#dc2626"}}>%{fireOrani.toFixed(1)}</div>
            </div>
            <div style={{background:"#f0fdf4",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#6b7280"}}>Plaka Ölçüsü</div>
              <div style={{fontSize:"16px",fontWeight:"700",color:"#16a34a"}}>{plakaEni} × {plakaBoy} cm</div>
            </div>
            {urun.tipAdi && (
              <div style={{background:"#faf5ff",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:"11px",color:"#6b7280"}}>{urun.tipAdi}</div>
                <div style={{fontSize:"16px",fontWeight:"700",color:"#7c3aed"}}>{urun.toplamAdet} adet</div>
              </div>
            )}
          </div>

          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"8px",padding:"10px 14px",marginBottom:"20px",fontSize:"13px",color:"#92400e"}}>
            💡 Fire oranı <strong>%{fireOrani.toFixed(1)}</strong> olarak hesaplandı. <strong>Yeni İş</strong> sayfasında "Plaka Planlayıcıdan Al" butonuna basarak maliyete dahil edebilirsiniz.
          </div>

          {plakalar.map((plakaYerlesim,plakaIdx) => {
            const kullanilanCm2 = plakaYerlesim.reduce((a,p)=>a+p.en*p.boy,0);
            const toplamCm2 = plakaEni*plakaBoy;
            const plakaFire = toplamCm2>0 ? ((toplamCm2-kullanilanCm2)/toplamCm2*100).toFixed(1) : "0";
            return (
              <div key={plakaIdx} style={{marginBottom:"32px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
                  <h3 style={{fontSize:"14px",fontWeight:"600",margin:0}}>Plaka {plakaIdx+1}</h3>
                  <span style={{fontSize:"12px",color:"#6b7280"}}>{plakaEni} × {plakaBoy} cm</span>
                  <span style={{fontSize:"12px",background:"#fef2f2",color:"#dc2626",borderRadius:"20px",padding:"2px 10px"}}>Fire: %{plakaFire}</span>
                  <span style={{fontSize:"12px",background:"#eff6ff",color:"#1d4ed8",borderRadius:"20px",padding:"2px 10px"}}>{plakaYerlesim.length} parça</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <div style={{position:"relative",width:CANVAS_EN,height:CANVAS_BOY,margin:"0 auto",borderRadius:"4px",overflow:"hidden",border:"2px solid #94a3b8"}}>
                    {urun.gorselUrl ? (
                      <img src={urun.gorselUrl} alt="plaka" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
                    ) : (
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#e8dcc8 0%,#d4c4a0 50%,#c8b890 100%)"}} />
                    )}
                    <div style={{position:"absolute",top:4,right:6,fontSize:"10px",fontWeight:"700",color:"white",background:"rgba(0,0,0,0.5)",borderRadius:"4px",padding:"2px 6px"}}>
                      {plakaEni} × {plakaBoy} cm
                    </div>
                    {plakaYerlesim.map(p => (
                      <div key={p.id} style={{position:"absolute",left:p.x*olcek,top:p.y*olcek,width:p.en*olcek,height:p.boy*olcek,background:p.renk+"33",border:`2px solid ${p.renk}`,boxSizing:"border-box",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:2,left:2,right:2,background:p.renk+"dd",borderRadius:"3px",padding:"1px 3px"}}>
                          <div style={{fontSize:"8px",fontWeight:"700",color:"white",lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.baslik}</div>
                          <div style={{fontSize:"8px",color:"rgba(255,255,255,0.9)",lineHeight:1.2}}>{p.en}×{p.boy}cm</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"10px"}}>
                  {plakaYerlesim.map(p => (
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:"6px",padding:"4px 10px",background:"#f9fafb",borderRadius:"20px",fontSize:"12px",border:`1px solid ${p.renk}33`}}>
                      <span style={{width:"8px",height:"8px",borderRadius:"2px",background:p.renk,flexShrink:0}} />
                      <span style={{fontWeight:"500"}}>{p.baslik}</span>
                      <span style={{color:"#9ca3af"}}>{p.en}×{p.boy}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAcik && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{background:"white",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"340px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
              <h3 style={{fontSize:"15px",fontWeight:"600",margin:0}}>
                {aktifTip==="sabit" ? sabitAlanlar[aktifIndex].baslik : (ozelAlanlar[aktifIndex].baslik||`Özel Alan ${aktifIndex+1}`)}
              </h3>
              <button onClick={()=>setModalAcik(false)} style={{background:"none",border:"none",fontSize:"20px",cursor:"pointer",color:"#6b7280"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {[{label:"En (cm)",key:"en"},{label:"Boy (cm)",key:"boy"}].map(({label,key}) => (
                <div key={key}>
                  <label style={{fontSize:"11px",color:"#6b7280",display:"block",marginBottom:"4px"}}>{label}</label>
                  <input type="number" value={(geciciDetay as any)[key]} onChange={e=>setGeciciDetay(prev=>({...prev,[key]:e.target.value}))}
                    style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"7px 10px",fontSize:"13px",boxSizing:"border-box"}} />
                </div>
              ))}
            </div>
            <div style={{marginTop:"10px"}}>
              <label style={{fontSize:"11px",color:"#6b7280",display:"block",marginBottom:"4px"}}>Yön</label>
              <select value={geciciDetay.yon} onChange={e=>setGeciciDetay(prev=>({...prev,yon:e.target.value}))}
                style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"7px 10px",fontSize:"13px"}}>
                {YON_SECENEKLERI.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:"10px",marginTop:"18px"}}>
              <button onClick={()=>setModalAcik(false)}
                style={{flex:1,padding:"9px",border:"1px solid #d1d5db",borderRadius:"8px",background:"white",cursor:"pointer",fontSize:"13px"}}>
                İptal
              </button>
              <button onClick={modalKaydet}
                style={{flex:1,padding:"9px",border:"none",borderRadius:"8px",background:"#1d4ed8",color:"white",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
