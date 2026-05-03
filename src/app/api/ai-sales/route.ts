import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";


export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY eksik" }, { status: 500 });
    }

    const body = await req.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sen mermer, porselen tezgah ve iç mimari proje satışlarında uzman bir satış koçusun. Sadece geçerli JSON döndür. Türkçe yaz.",
        },
        {
          role: "user",
          content: JSON.stringify({
            gorev: "Teklifin kapanma ihtimalini analiz et ve satış aksiyonu üret.",
            teklif: {
              musteri: body.musteri || "Müşteri",
              tutar: Number(body.tutar || 0),
              goruntulenme: Number(body.goruntulenme || 0),
              pdf: Number(body.pdf || 0),
            },
            beklenen_json: {
              ihtimal: "0-100 arası sayı",
              aksiyon: "hemen ara / mesaj at / bekle / kaybet",
              risk: "kısa risk açıklaması",
              oneriler: "satıcıya net satış taktiği",
              mesaj: "müşteriye gönderilecek kısa WhatsApp mesajı",
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);

    return NextResponse.json({
      ihtimal: Number(json.ihtimal || 0),
      aksiyon: String(json.aksiyon || "mesaj at"),
      risk: String(json.risk || ""),
      oneriler: String(json.oneriler || ""),
      mesaj: String(json.mesaj || ""),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI hata", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
