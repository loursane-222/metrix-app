import { prisma } from "@/lib/prisma";
import webpush from "web-push";

export async function POST(req: Request) {
  try {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return Response.json(
        { error: "Web push anahtarları eksik." },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      "mailto:info@metrixtezgah.com",
      publicKey,
      privateKey
    );

    const { title, body, userIds } = await req.json();

    if (!title || !body || !Array.isArray(userIds)) {
      return Response.json({ error: "Eksik veri." }, { status: 400 });
    }

    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
    });

    const payload = JSON.stringify({
      notification: { title, body },
    });

    await Promise.allSettled(
      tokens.map((t) => webpush.sendNotification(t.token, payload))
    );

    return Response.json({ ok: true, sent: tokens.length });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
