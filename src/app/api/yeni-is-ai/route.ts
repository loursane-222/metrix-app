import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY eksik" }, { status: 500 });
    }
    const body = await req.json();
    const metin = String(body?.metin || "").trim();
    if (!metin) {
      return NextResponse.json({ error: "İş açıklaması boş olamaz." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `Sen Türkiye'deki bir mermer/porselen/granit tezgah atölyesinin iş emri parser motorusun.
Kullanıcı serbest konuşma veya dikte ile iş bilgilerini anlatır — sen bu bilgileri yapısal JSON'a çevirirsin.

SEKTÖR SÖZLÜĞÜ:
Parça tipleri:
- tezgah: Mutfak/banyo üst yüzeyi. "ana tezgah", "üst", "ana parça" da olabilir.
- tezgah_arasi: Ocak ile dolap arası dikey panel. "arası", "panel", "duvar" da olabilir.
- on_alin: Tezgah ön kenar bandı. "alın", "ön bant" da olabilir. En genellikle 4-6cm.
- ada_tezgah: Mutfak adası üst yüzeyi.
- ada_ayak: Ada yan yüzeyi.
- basamak: Merdiven basamağı.
- supurgelik: Süpürgelik profili.

Ölçü formatları (hepsi cm):
- "285'e 65" veya "285x65" = boyCm:285 enCm:65
- "üç metre on" = boyCm:310
- "iki seksen beşe altmış beş" = boyCm:285 enCm:65
- Tek sayı verilirse genellikle boy (uzunluk).
- "iki parça", "çift", "aynısından" = adet:2
- boyCm = uzun kenar, enCm = kısa kenar (genişlik)

Operasyonlar:
- pahlama: Kenar profil. "profil", "yuvarlatma". Mtül cinsinden.
- kesim_45: 45 derece köşe kesimi. "L birleşim", "köşe". Mtül cinsinden.
- eviye_kesim: Eviye/lavabo deliği. Adet cinsinden.
- ocak_kesim: Ocak deliği. Adet cinsinden.
- delik: Priz/musluk/vana deliği. Adet cinsinden.
- yapistirma: Yapıştırma. Mtül cinsinden.

Plaka:
- Standart: 320x160, 324x162, 300x150, 280x140 cm
- "büyük plaka" = genellikle 320x160
- Fiyat euro cinsinden. Kur söylenmezse 53 varsay.
- enCm = kısa kenar (160), boyCm = uzun kenar (320)

Taş durumu:
- stokta: "bizde var", "stoktan", "elimizde"
- alinacak: "alınacak", "sipariş", "temin"
- musteriye_ait: "müşteri getiriyor", "kendi taşı"

Müşteri tipi:
- son_kullanici: Bireysel ev sahibi
- mimar: Mimar/tasarımcı
- bayi: Bayi/toptancı
- muteahhit: Müteahhit
- imalatci: Üretici firma

KURALLAR:
1. Metinde açıkça söylenmeyen hiçbir şeyi uydurma.
2. parcalar dizisinde on_alin tipi OLUŞTURMA. Bunun yerine ilgili tezgah parçasına onAlin:true ekle.
3. Aynı ölçüde birden fazla parça → adet kullan.
4. Müşteri adı varsa mutlaka doldur, hem musteri.ad hem isBilgisi.musteriAdi aynı olsun.
5. Eksik kritik bilgileri eksikSorular'a yaz.
6. guvenSkoru: 80+ tüm bilgiler var, 50-79 bazı eksikler, 50 altı çok eksik.
7. Sadece geçerli JSON döndür.`;

    const userPrompt = `Aşağıdaki iş emri metnini parse et:

"${metin}"

JSON yapısı:
{
  "guvenSkoru": 85,
  "musteri": {
    "ad": "Ahmet Yılmaz",
    "tip": "mevcut | yeni | belirsiz",
    "musteriTipi": "son_kullanici | mimar | bayi | muteahhit | imalatci",
    "telefon": "",
    "not": ""
  },
  "isBilgisi": {
    "musteriAdi": "Ahmet Yılmaz",
    "isAdi": "Mutfak Tezgahı",
    "isTuru": "perakende | proje | fason | belirsiz"
  },
  "malzeme": {
    "marka": "Laminam",
    "seri": "Fokos",
    "renk": "Roccia",
    "urunAdi": "Laminam Fokos Roccia",
    "plakaFiyatiEuro": 220,
    "kur": 53,
    "kdvDahil": null,
    "tasDurumu": "stokta | alinacak | musteriye_ait | belirsiz",
    "plakaOlcusu": { "enCm": 160, "boyCm": 320 }
  },
  "parcalar": [
    {
      "etiket": "Ana tezgah",
      "standartTip": "tezgah",
      "boyCm": 285,
      "enCm": 65,
      "adet": 1,
      "onAlin": false,
      "damarTakibi": false,
      "not": ""
    }
  ],
  "operasyonlar": [
    {
      "tip": "pahlama | kesim_45 | eviye_kesim | ocak_kesim | delik | yapistirma",
      "etiket": "Pahlama",
      "adet": 0,
      "mtul": 2.85
    }
  ],
  "eksikSorular": [],
  "uyarilar": []
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let json: any = {};
    try { json = JSON.parse(raw); } catch { json = {}; }

    // Senkronize: musteri.ad ↔ isBilgisi.musteriAdi
    if (!json?.musteri?.ad && json?.isBilgisi?.musteriAdi) {
      json.musteri = { ...(json.musteri || {}), ad: json.isBilgisi.musteriAdi };
    }
    if (!json?.isBilgisi?.musteriAdi && json?.musteri?.ad) {
      json.isBilgisi = { ...(json.isBilgisi || {}), musteriAdi: json.musteri.ad };
    }

    // Eksik kontrol
    const eksikler: string[] = [];
    if (!json?.musteri?.ad) eksikler.push("Müşteri adı");
    if (!json?.malzeme?.urunAdi) eksikler.push("Taş / ürün adı");
    if (!json?.malzeme?.plakaFiyatiEuro || Number(json.malzeme.plakaFiyatiEuro) <= 0) eksikler.push("Plaka fiyatı (Euro)");
    if (!json?.malzeme?.kur || Number(json.malzeme.kur) <= 0) eksikler.push("Döviz kuru");
    if (!json?.malzeme?.tasDurumu || json.malzeme.tasDurumu === "belirsiz") eksikler.push("Taş durumu");
    if (!json?.malzeme?.plakaOlcusu?.enCm || !json?.malzeme?.plakaOlcusu?.boyCm) eksikler.push("Plaka ölçüsü");
    if (!Array.isArray(json?.parcalar) || json.parcalar.length === 0) eksikler.push("Kesim parçaları");

    return NextResponse.json({
      ok: true,
      sonuc: json,
      sistemKontrol: { eksikler, hesaplamayaHazir: eksikler.length === 0 },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "AI parser hata", detail: String(e?.message || e) }, { status: 500 });
  }
}
