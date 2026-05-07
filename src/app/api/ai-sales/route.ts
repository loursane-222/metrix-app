import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY eksik" }, { status: 500 });
    }

    const body = await req.json();
    const tip = body.tip || "satis";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let systemPrompt = "";
    let userPrompt = "";

    if (tip === "tahsilat") {
      systemPrompt =
        "Sen mermer ve porselen tezgah atölyesi adına tahsilat takibi yapan profesyonel bir muhasebe asistanısın. Kibarca, net ve ödemeyi teşvik eden mesajlar yazarsın. Sadece geçerli JSON döndür. Türkçe yaz.";
      userPrompt = JSON.stringify({
        gorev: "Vadesi gelmiş veya geçmiş ödeme için müşteriye WhatsApp mesajı yaz.",
        veri: {
          musteriAdi: body.musteriAdi || "Müşteri",
          tutar: Number(body.tutar || 0),
          vadeTarihi: body.vadeTarihi || "",
          gecenGun: Number(body.gecenGun || 0),
          teklifNo: body.teklifNo || "",
        },
        beklenen_json: {
          mesaj: "müşteriye gönderilecek kısa, kibar, ödemeyi teşvik eden WhatsApp mesajı. Merhaba ile başla, isim kullan, tutar ve vadeyi belirt, ödeme hatırlatması yap, yardımcı olmak istediğini belirt. 3-4 cümle.",
        },
      });
    } else {
      systemPrompt =
        "Sen mermer, porselen tezgah ve iç mimari proje satışlarında uzman bir satış koçusun. Satışı kapatmaya odaklı, samimi ve profesyonel WhatsApp mesajları yazarsın. Sadece geçerli JSON döndür. Türkçe yaz.";
      userPrompt = JSON.stringify({
        gorev: "Teklif durumuna göre satışı ilerletecek bir WhatsApp mesajı yaz.",
        veri: {
          musteriAdi: body.musteri || "Müşteri",
          tutar: Number(body.tutar || 0),
          goruntulenme: Number(body.goruntulenme || 0),
          pdf: Number(body.pdf || 0),
          aksiyonTipi: body.aksiyonTipi || "",
          aksiyonSaati: Number(body.aksiyonSaati || 0),
          ihtimal: Number(body.ihtimal || 0),
        },
        talimatlar: [
          "Merhaba ile başla, müşteri adını kullan",
          "Teklifin incelendiğini gördüğünü belirt (eğer goruntulenme > 0 ise)",
          "Sorusu olursa yardımcı olmak istediğini söyle",
          "aksiyonTipi satis ise: bugün karar vermeleri için nazik ama net bir yönlendirme yap",
          "aksiyonTipi ara ise: kısa görüşme teklif et",
          "aksiyonTipi risk ise: teklif geçerlilik süresine dikkat çek",
          "3-4 cümle, doğal konuşma dili, aşırı satışçı olmayan bir ton",
        ],
        beklenen_json: {
          mesaj: "müşteriye gönderilecek WhatsApp mesajı",
          aksiyon: "hemen ara / mesaj at / bekle",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);

    return NextResponse.json({
      mesaj: String(json.mesaj || ""),
      aksiyon: String(json.aksiyon || "mesaj at"),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI hata", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
