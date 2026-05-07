import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY eksik" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const metin = String(body?.metin || "").trim();

    if (!metin) {
      return NextResponse.json(
        { error: "İş açıklaması boş olamaz." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Sen Metrix2 için çalışan güvenli bir yeni iş parser motorusun.
Görevin kullanıcının Türkçe konuşma/dikte metnini standart JSON'a çevirmektir.

ASLA hesaplama sonucu uydurma.
ASLA eksik bilgiyi tahmin etme.
Metinde açıkça söylenmeyen stok, taş alınacak, müşteri taşı, plaka ölçüsü, damar takibi gibi alanları tahmin etme.
Eksik bilgi varsa boş bırak, belirsiz yap veya eksikSorular içine yaz.
guvenSkoru mutlaka sayı olmalı.
urunAdi varsa marka + seri + renk birleşimi olarak doldurulmalı.
"ocak var", "ocak yeri", "ocak açılacak" ifadeleri mutlaka ocak_kesim olmalı.
"eviye", "evye" ifadeleri eviye_kesim veya eviye_alttan_yapistirma olarak sınıflandırılmalı.
tasDurumu sadece kullanıcı açıkça stokta / alınacak / müşteriye ait dediğinde doldurulmalı; aksi halde belirsiz olmalı.
Sadece geçerli JSON döndür.

Önemli:
- AI karar vermez, sadece veriyi ayrıştırır.
- Plaka yerleşimi yapmaz.
- Maliyet hesaplamaz.
- Teklif kaydetmez.
- Kullanıcının söylediği kelimeleri "etiket" alanında koru.
- Sistemsel sınıflandırmayı "standartTip" alanında ver.

standartTip önerileri:
tezgah, tezgah_arasi, on_alin, dusey_donus, ada_tezgah, ada_ayak,
basamak, riht, kaplama, supurgelik, davlumbaz, panel, diger

operasyon tipleri:
ocak_kesim, eviye_kesim, eviye_alttan_yapistirma, kesim_45,
pahlama, yapistirma, stres_alma, fason_ebatlama, delik, diger

isTuru:
perakende, proje, fason, belirsiz

tasDurumu:
stokta, alinacak, musteriye_ait, belirsiz

"yeni müşteri", "ilk defa", "sistemde yok", "kayıtlı değil" gibi ifadeler varsa musteri.tip = "yeni" olmalı.
Müşteri adı söylendi ama yeni/mevcut açık değilse musteri.tip = "belirsiz" olmalı.
musteri.ad ile isBilgisi.musteriAdi aynı olmalı.
Kur söylenirse malzeme.kur alanına sayı olarak yaz.
Her ölçü cm cinsinden dönmeli.
Örnek: "310x65" => boyCm: 310, enCm: 65.
Metraj gerekiyorsa mtul alanını ayrıca çıkarabilirsin ama ölçüyü silme.
Operasyonlarda 45 kesim, pahlama, yapıştırma, stres alma, fason ebatlama için uzunluk cm cinsinden söylenirse mtul = cm / 100 olarak yaz.
Örnek: "45 kesim 285 cm" => operasyonlar tip: "kesim_45", mtul: 2.85.
Örnek: "pahlama 285" => tip: "pahlama", mtul: 2.85.
Örnek: "yapıştırma 285" => tip: "yapistirma", mtul: 2.85.
"45 kesim" için tip her zaman "kesim_45" olmalı.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            gorev: "Yeni iş dikte metnini güvenli şekilde parse et.",
            metin,
            beklenen_json: {
              guvenSkoru: "0-100 arası sayı",
              musteri: {
                ad: "",
                tip: "mevcut | yeni | belirsiz",
                telefon: "",
                not: ""
              },
              isBilgisi: {
                musteriAdi: "",
                isAdi: "",
                isTuru: "perakende | proje | fason | belirsiz",
              },
              malzeme: {
                marka: "",
                seri: "",
                renk: "",
                urunAdi: "",
                plakaFiyatiEuro: 0,
                kur: 0,
                kdvDahil: null,
                tasDurumu: "stokta | alinacak | musteriye_ait | belirsiz",
                plakaOlcusu: {
                  enCm: 0,
                  boyCm: 0,
                },
              },
              parcalar: [
                {
                  etiket: "",
                  standartTip: "",
                  boyCm: 0,
                  enCm: 0,
                  adet: 1,
                  mtul: 0,
                  damarTakibi: false,
                  teklifteGorunsun: true,
                  not: "",
                },
              ],
              operasyonlar: [
                {
                  tip: "",
                  etiket: "",
                  detay: "",
                  makine: "",
                  adet: 0,
                  mtul: 0,
                },
              ],
              eksikSorular: [
                "Eksik veya çelişkili bilgi varsa kullanıcıya sorulacak net soru",
              ],
              uyarilar: [
                "KDV dahil fiyat, fason iş, damar takibi gibi dikkat gerektiren notlar",
              ],
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);

    const eksikler: string[] = [];

    if (!json?.musteri?.ad && json?.isBilgisi?.musteriAdi) {
      json.musteri = {
        ...(json.musteri || {}),
        ad: json.isBilgisi.musteriAdi,
        tip: "belirsiz",
      };
    }

    if (!json?.isBilgisi?.musteriAdi && json?.musteri?.ad) {
      json.isBilgisi = {
        ...(json.isBilgisi || {}),
        musteriAdi: json.musteri.ad,
      };
    }

    if (!json?.isBilgisi?.musteriAdi && !json?.musteri?.ad) {
      eksikler.push("Müşteri adı eksik.");
    }

    if (!json?.malzeme?.urunAdi) {
      eksikler.push("Taş / ürün adı eksik.");
    }

    if (!json?.malzeme?.plakaFiyatiEuro || Number(json.malzeme.plakaFiyatiEuro) <= 0) {
      eksikler.push("Plaka fiyatı eksik.");
    }

    if (!json?.malzeme?.tasDurumu || json.malzeme.tasDurumu === "belirsiz") {
      eksikler.push("Taş stokta mı, alınacak mı, yoksa müşteriye mi ait?");
    }

    if (
      !json?.malzeme?.plakaOlcusu?.enCm ||
      !json?.malzeme?.plakaOlcusu?.boyCm
    ) {
      eksikler.push("Plaka ölçüsü eksik.");
    }

    if (!Array.isArray(json?.parcalar) || json.parcalar.length === 0) {
      eksikler.push("Kesilecek parça ölçüleri eksik.");
    }

    return NextResponse.json({
      ok: true,
      sonuc: json,
      sistemKontrol: {
        eksikler,
        hesaplamayaHazir: eksikler.length === 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI parser hata", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
