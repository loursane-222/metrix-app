import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

function normalizeTranscript(text: string): string {
  return text
    .replace(/(\d+)[''`]?[eE]\s+(\d+)/g, "$1x$2")
    .replace(/(\d+)\s+[eE]\s+(\d+)/g, "$1x$2")
    .replace(/\bvirgül\b/gi, ".")
    .replace(/\bnokta\b/gi, ".")
    .replace(/(\d+)\s*euro/gi, "$1 euro")
    .replace(/\b(türk\s*lirası|lira)\b/gi, "TL")
    .replace(/\bbir\s+adet\b/gi, "1 adet")
    .replace(/\biki\s+adet\b/gi, "2 adet")
    .replace(/\büç\s+adet\b/gi, "3 adet")
    .replace(/\bdört\s+adet\b/gi, "4 adet")
    .replace(/\bbeş\s+adet\b/gi, "5 adet")
    .trim();
}

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
      prompt: `Türkiye mermer/porselen tezgah atölyesi iş emri diktesi. Terimler: müşteri adı, Calacatta, Statuario, Laminam, Dekton, porselen, granit, plaka fiyatı euro, döviz kuru, tezgah ölçüsü, tezgah arası, ön alın, ada tezgah, ada ayak, pahlama, 45 derece kesim, yapıştırma, stres alma, eviye deliği, ocak deliği, priz deliği, mtül, plaka eni, plaka boyu, damar takibi, adet, taş stokta, taş alınacak, müşteri taşı, fason, L tezgah, U tezgah. Ölçüler: 285'e 65 veya 285x65 (boy x en cm).`,
    });
    const normalized = normalizeTranscript(transcription.text);
    return NextResponse.json({ metin: normalized, ham: transcription.text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Whisper hatası" }, { status: 500 });
  }
}
