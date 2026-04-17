"use client";

import { useState, useRef } from "react";

const YON_SECENEKLERI = ["Enine", "Boyuna", "Serbest"];
const SABIT_ALANLAR = ["Ön Alın","Tezgah","Tezgah Arası","L Tezgah Dönüş","Ada","Ada Tezgah Ayak","Ada Tezgah Ayak Kalınlığı"];
const RENKLER = ["#2563eb","#d97706","#059669","#dc2626","#7c3aed","#0891b2","#ea580c","#65a30d","#db2777","#4f46e5"];

interface KesimDetay { en: string; boy: string; yon: string; }
interface KesimAlani { id: string; baslik: string; detay: KesimDetay; aktif: boolean; sira: number; }
interface Parca { id: string; baslik: string; en: number; boy: number; }
interface YerlesilenParca { id: string; baslik: string; x: number; y: number; en: number; boy: number; renk: string; }

export interface PlakaHesapSonucu {
  fireOrani: number;
  toplamPlakaAdet: number;
  plakaEni: number;
  plakaBoy: number;
}

interface Props {
  plakaEni: string;
  plakaBoy: string;
  onHesapla: (sonuc: PlakaHesapSonucu) => void;
}

const bos: KesimDetay = { en: "", boy: "", yon: "Serbest" };

export function PlakaPlanlayiciMini({ plakaEni: plakaEniProp, plakaBoy: plakaBoyProp, onHesapla }: Props) {
  const [acik, setAcik] = useState(false);
  const [sabitAlanlar, setSabitAlanlar] = useState<KesimAlani[]>(
    SABIT_ALANLAR.map((b,i) => ({ id:`sabit-${i}`, baslik:b, detay:{...bos}, aktif:false, sira:i }))
  );
  const [ozelAlanlar, setOzelAlanlar] = useState<KesimAlani[]>(
    Array.from({length:5},(_,i) => ({ id:`ozel-${i}`, baslik:"", detay:{...bos}, aktif:false, sira:100+i }))
  );
  const [modalAcik, setModalAcik] = useState(false);
  const [aktifTip, setAktifTip] = useState<"sabit"|"ozel">("sabit");
  const [aktifIndex, setAktifIndex] = useState(0);
  const [geciciDetay, setGeciciDetay] = useState<KesimDetay>({...bos});
  const [plakalar, setPlakalar] = useState<YerlesilenParca[][]>([]);
  const [uyari, setUyari] = useState<string[]>([]);
  const [hesaplandi, setHesaplandi] = useState(false);
  const [fireOrani, setFireOrani] = useState(0);
  const [toplamPlakaAdet, setToplamPlakaAdet] = useState(0);
  const [tipAdet, setTipAdet] = useState("1");
  const [gorselUrl, setGorselUrl] = useState<string|null>(null);
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

  function hesapla() {
    setUyari([]); setHesaplandi(false); setPlakalar([]);
    const plakaEni = parseFloat(plakaEniProp);
    const plakaBoy = parseFloat(plakaBoyProp);
    const adet = Math.max(1, parseInt(tipAdet)||1);

    if (!plakaEni||!plakaBoy) { setUyari(["Önce plaka eni ve boyunu girin."]); return; }

    const aktifAlanlar = [...sabitAlanlar,...ozelAlanlar]
      .filter(a => a.aktif && parseFloat(a.detay.en)>0 && parseFloat(a.detay.boy)>0)
      .sort((a,b) => a.sira-b.sira);

    if (aktifAlanlar.length===0) { setUyari(["Hiç kesim alanı girilmedi."]); return; }

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

    const tumPlakalar: YerlesilenParca[][] = [];
    let bekleyenler = [...tumParcalar];
    const uyarilar: string[] = [];

    while (bekleyenler.length>0 && tumPlakalar.length<50) {
      let mevcutX=0, mevcutY=0, satirY=0;
      const buPlaka: YerlesilenParca[] = [];
      const yerlestirildi = new Set<string>();

      for (const parca of bekleyenler) {
        const renkIdx = tumParcalar.findIndex(p=>p.id===parca.id) % RENKLER.length;
        if (parca.en>plakaEni || parca.boy>plakaBoy) continue;
        if (mevcutX+parca.en>plakaEni) { mevcutX=0; mevcutY=satirY; }
        if (mevcutY+parca.boy>plakaBoy) continue;
        buPlaka.push({ id:parca.id, baslik:parca.baslik, x:mevcutX, y:mevcutY, en:parca.en, boy:parca.boy, renk:RENKLER[renkIdx] });
        yerlestirildi.add(parca.id);
        mevcutX += parca.en;
        if (mevcutY+parca.boy>satirY) satirY=mevcutY+parca.boy;
      }

      if (buPlaka.length===0) { bekleyenler.forEach(p=>uyarilar.push(`"${p.baslik}" sığmıyor.`)); break; }
      tumPlakalar.push(buPlaka);
      bekleyenler = bekleyenler.filter(p=>!yerlestirildi.has(p.id));
    }

    const toplamCm2 = tumPlakalar.length*plakaEni*plakaBoy;
    const kullanilanCm2 = tumPlakalar.flat().reduce((a,p)=>a+p.en*p.boy,0);
    const fire = toplamCm2>0 ? ((toplamCm2-kullanilanCm2)/toplamCm2)*100 : 0;

    setPlakalar(tumPlakalar);
    setFireOrani(fire);
    setToplamPlakaAdet(tumPlakalar.length);
    setUyari(uyarilar);
    setHesaplandi(true);

    // Üst bileşene bildir
    onHesapla({ fireOrani: fire, toplamPlakaAdet: tumPlakalar.length, plakaEni, plakaBoy });
  }

  const plakaEniN = parseFloat(plakaEniProp)||0;
  const plakaBoyN = parseFloat(plakaBoyProp)||0;
  const CANVAS_EN = 480;
  const CANVAS_BOY = plakaEniN>0&&plakaBoyN>0 ? Math.round(CANVAS_EN*(plakaBoyN/plakaEniN)) : 250;
  const olcek = plakaEniN>0 ? CANVAS_EN/plakaEniN : 1;

  return (
    <div style={{marginTop:"16px"}}>
      <button
        type="button"
        onClick={()=>setAcik(!acik)}
        style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",border:"1px solid #3b82f6",borderRadius:"8px",background:acik?"#eff6ff":"white",cursor:"pointer",fontSize:"13px",color:"#2563eb",fontWeight:"500"}}
      >
        <span>{acik?"▼":"▶"}</span>
        🔲 Plaka Yerleşim Planlayıcı
        {hesaplandi && (
          <span style={{marginLeft:"8px",background:"#dc2626",color:"white",borderRadius:"20px",padding:"2px 8px",fontSize:"11px"}}>
            Fire: %{fireOrani.toFixed(1)} · {toplamPlakaAdet} plaka
          </span>
        )}
      </button>

      {acik && (
        <div style={{border:"1px solid #e5e7eb",borderRadius:"10px",padding:"16px",marginTop:"8px",background:"#f9fafb"}}>

          {(!plakaEniProp||!plakaBoyProp) && (
            <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"13px",color:"#92400e"}}>
              ⚠ Plaka eni ve boyunu yukarıda girdikten sonra bu bölümü kullanın.
            </div>
          )}

          {/* Tip adeti */}
          <div style={{marginBottom:"12px"}}>
            <label style={{fontSize:"12px",color:"#6b7280",display:"block",marginBottom:"4px"}}>Toplam Tip Adeti</label>
            <input type="number" value={tipAdet} onChange={e=>setTipAdet(e.target.value)} min="1"
              style={{width:"120px",border:"1px solid #d1d5db",borderRadius:"8px",padding:"6px 10px",fontSize:"13px"}} />
          </div>

          {/* Plaka görseli */}
          <div style={{marginBottom:"12px"}}>
            <label style={{fontSize:"12px",color:"#6b7280",display:"block",marginBottom:"4px"}}>Plaka Görseli (isteğe bağlı)</label>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <button type="button" onClick={()=>gorselRef.current?.click()}
                style={{padding:"5px 12px",border:"1px dashed #d1d5db",borderRadius:"6px",background:"white",cursor:"pointer",fontSize:"12px",color:"#6b7280"}}>
                📁 Yükle
              </button>
              {gorselUrl && <img src={gorselUrl} alt="plaka" style={{height:"36px",width:"72px",objectFit:"cover",borderRadius:"4px",border:"1px solid #e5e7eb"}} />}
              <input ref={gorselRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setGorselUrl(URL.createObjectURL(f));}} />
            </div>
          </div>

          {/* Sabit Kesim Alanları */}
          <div style={{marginBottom:"12px"}}>
            <div style={{fontSize:"12px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Sabit Kesim Alanları</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
              {sabitAlanlar.map((alan,i) => (
                <div key={alan.id} style={{border:`1px solid ${alan.aktif?RENKLER[i%RENKLER.length]:"#e5e7eb"}`,borderRadius:"8px",padding:"8px",background:alan.aktif?RENKLER[i%RENKLER.length]+"11":"white"}}>
                  <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"2px"}}>{alan.baslik}</div>
                  {alan.aktif && <div style={{fontSize:"10px",color:"#6b7280",marginBottom:"4px"}}>{alan.detay.en}×{alan.detay.boy}cm</div>}
                  <button type="button" onClick={()=>modalAc("sabit",i)}
                    style={{width:"100%",padding:"3px",border:"1px solid #e5e7eb",borderRadius:"4px",background:"white",cursor:"pointer",fontSize:"10px",color:"#374151"}}>
                    ✏ Detay Gir
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Özel Alanlar */}
          <div style={{marginBottom:"12px"}}>
            <div style={{fontSize:"12px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Diğer Kesim Ölçüleri</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
              {ozelAlanlar.map((alan,i) => (
                <div key={alan.id} style={{border:`1px solid ${alan.aktif?RENKLER[(SABIT_ALANLAR.length+i)%RENKLER.length]:"#e5e7eb"}`,borderRadius:"8px",padding:"8px",background:alan.aktif?RENKLER[(SABIT_ALANLAR.length+i)%RENKLER.length]+"11":"white"}}>
                  <input type="text" placeholder={`Özel ${i+1}`} value={alan.baslik}
                    onChange={e=>setOzelAlanlar(prev=>{const y=[...prev];y[i]={...y[i],baslik:e.target.value};return y;})}
                    style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:"4px",padding:"3px 6px",fontSize:"11px",marginBottom:"4px",boxSizing:"border-box"}} />
                  {alan.aktif && <div style={{fontSize:"10px",color:"#6b7280",marginBottom:"4px"}}>{alan.detay.en}×{alan.detay.boy}cm</div>}
                  <button type="button" onClick={()=>modalAc("ozel",i)}
                    style={{width:"100%",padding:"3px",border:"1px solid #e5e7eb",borderRadius:"4px",background:"white",cursor:"pointer",fontSize:"10px",color:"#374151"}}>
                    ✏ Detay Gir
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hesapla */}
          <button type="button" onClick={hesapla}
            style={{padding:"8px 24px",background:"#1d4ed8",color:"white",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer",marginBottom:"12px"}}>
            🔲 Yerleşimi Hesapla
          </button>

          {uyari.length>0 && (
            <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:"8px",padding:"10px",marginBottom:"12px"}}>
              {uyari.map((u,i)=><div key={i} style={{fontSize:"12px",color:"#92400e"}}>⚠ {u}</div>)}
            </div>
          )}

          {hesaplandi && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"16px"}}>
                <div style={{background:"#eff6ff",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:"10px",color:"#6b7280"}}>Toplam Plaka</div>
                  <div style={{fontSize:"20px",fontWeight:"700",color:"#1d4ed8"}}>{toplamPlakaAdet}</div>
                </div>
                <div style={{background:"#fef2f2",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:"10px",color:"#6b7280"}}>Fire Oranı</div>
                  <div style={{fontSize:"20px",fontWeight:"700",color:"#dc2626"}}>%{fireOrani.toFixed(1)}</div>
                </div>
                <div style={{background:"#f0fdf4",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:"10px",color:"#6b7280"}}>Plaka Ölçüsü</div>
                  <div style={{fontSize:"14px",fontWeight:"700",color:"#16a34a"}}>{plakaEniN}×{plakaBoyN}</div>
                </div>
              </div>

              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"8px",padding:"10px 14px",marginBottom:"16px",fontSize:"13px",color:"#15803d"}}>
                ✅ Fire oranı <strong>%{fireOrani.toFixed(1)}</strong> ve <strong>{toplamPlakaAdet} plaka</strong> maliyet hesabına yansıtıldı.
              </div>

              {plakalar.map((plakaYerlesim,plakaIdx) => {
                const kullanilanCm2=plakaYerlesim.reduce((a,p)=>a+p.en*p.boy,0);
                const toplamCm2=plakaEniN*plakaBoyN;
                const plakaFire=toplamCm2>0?((toplamCm2-kullanilanCm2)/toplamCm2*100).toFixed(1):"0";
                return (
                  <div key={plakaIdx} style={{marginBottom:"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                      <span style={{fontSize:"13px",fontWeight:"600"}}>Plaka {plakaIdx+1}</span>
                      <span style={{fontSize:"11px",color:"#6b7280"}}>{plakaEniN}×{plakaBoyN}cm</span>
                      <span style={{fontSize:"11px",background:"#fef2f2",color:"#dc2626",borderRadius:"20px",padding:"1px 8px"}}>Fire: %{plakaFire}</span>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <div style={{position:"relative",width:CANVAS_EN,height:CANVAS_BOY,borderRadius:"4px",overflow:"hidden",border:"2px solid #94a3b8"}}>
                        {gorselUrl ? (
                          <img src={gorselUrl} alt="plaka" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
                        ) : (
                          <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#e8dcc8 0%,#d4c4a0 50%,#c8b890 100%)"}} />
                        )}
                        <div style={{position:"absolute",top:3,right:5,fontSize:"9px",fontWeight:"700",color:"white",background:"rgba(0,0,0,0.5)",borderRadius:"3px",padding:"1px 5px"}}>
                          {plakaEniN}×{plakaBoyN}cm
                        </div>
                        {plakaYerlesim.map(p=>(
                          <div key={p.id} style={{position:"absolute",left:p.x*olcek,top:p.y*olcek,width:p.en*olcek,height:p.boy*olcek,background:p.renk+"33",border:`2px solid ${p.renk}`,boxSizing:"border-box",overflow:"hidden"}}>
                            <div style={{position:"absolute",top:1,left:1,right:1,background:p.renk+"dd",borderRadius:"2px",padding:"1px 2px"}}>
                              <div style={{fontSize:"7px",fontWeight:"700",color:"white",lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.baslik}</div>
                              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.9)"}}>{p.en}×{p.boy}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAcik && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{background:"white",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"320px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <h3 style={{fontSize:"14px",fontWeight:"600",margin:0}}>
                {aktifTip==="sabit" ? sabitAlanlar[aktifIndex].baslik : (ozelAlanlar[aktifIndex].baslik||`Özel Alan ${aktifIndex+1}`)}
              </h3>
              <button type="button" onClick={()=>setModalAcik(false)} style={{background:"none",border:"none",fontSize:"18px",cursor:"pointer",color:"#6b7280"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {[{label:"En (cm)",key:"en"},{label:"Boy (cm)",key:"boy"}].map(({label,key})=>(
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
            <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
              <button type="button" onClick={()=>setModalAcik(false)}
                style={{flex:1,padding:"8px",border:"1px solid #d1d5db",borderRadius:"8px",background:"white",cursor:"pointer",fontSize:"13px"}}>
                İptal
              </button>
              <button type="button" onClick={modalKaydet}
                style={{flex:1,padding:"8px",border:"none",borderRadius:"8px",background:"#1d4ed8",color:"white",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
