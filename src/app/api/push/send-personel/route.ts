import webpush from "web-push";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Web push anahtarları eksik." }, { status: 500 });
    }

    webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

    const { title, body, tokens } = await req.json();

    if (!title || !body || !Array.isArray(tokens)) {
      return NextResponse.json({ error: "Eksik veri." }, { status: 400 });
    }

    const payload = JSON.stringify({ notification: { title, body } });

    await Promise.allSettled(
      tokens.map((token: string) =>
        webpush.sendNotification({ endpoint: token, keys: { p256dh: "", auth: "" } } as any, payload)
      )
    );

    return NextResponse.json({ ok: true, sent: tokens.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
