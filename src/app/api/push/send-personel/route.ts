import webpush from "web-push";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "VAPID anahtarları eksik." }, { status: 500 });
    }

    webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

    const { title, body, subscriptions } = await req.json();

    if (!title || !body || !Array.isArray(subscriptions)) {
      return NextResponse.json({ error: "Eksik veri." }, { status: 400 });
    }

    const payload = JSON.stringify({ title, body, url: "/dashboard" });

    await Promise.allSettled(
      subscriptions.map(async (raw: string) => {
        try {
          const sub = JSON.parse(raw) as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          };
          if (!sub?.endpoint || !sub?.keys?.p256dh) return;
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload
          );
        } catch {
          // skip expired/invalid subscriptions
        }
      })
    );

    return NextResponse.json({ ok: true, sent: subscriptions.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
