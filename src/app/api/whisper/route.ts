import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY eksik" }, { status: 500 });
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "Ses dosyası eksik" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "tr",
      prompt: "Müşteri adı, ürün adı, plaka fiyatı, kur, ölçüler, tezgah, tezgah arası, ön alın, ada tezgah, pahlama, yapıştırma, kesim içeren atölye iş emri.",
    });

    return NextResponse.json({ metin: transcription.text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Whisper hatası" }, { status: 500 });
  }
}
