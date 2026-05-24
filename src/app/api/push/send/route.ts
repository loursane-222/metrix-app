import { prisma } from "@/lib/prisma";
import webpush from "web-push";

export async function POST(req: Request) {
  try {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return Response.json({ error: "VAPID anahtarları eksik." }, { status: 500 });
    }

    webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

    const { title, body, userIds } = await req.json();

    if (!title || !body || !Array.isArray(userIds)) {
      return Response.json({ error: "Eksik veri." }, { status: 400 });
    }

    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
    });

    const payload = JSON.stringify({ title, body, url: "/dashboard" });

    await Promise.allSettled(
      tokens.map(async (t) => {
        try {
          const sub = JSON.parse(t.token) as {
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

    return Response.json({ ok: true, sent: tokens.length });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
