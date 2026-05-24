import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";
import { NextResponse } from "next/server";

// POST /api/push/test
// Sends a test push to every subscription registered for the current atölye.
// Use from browser devtools: fetch("/api/push/test", { method: "POST" })

export async function POST() {
  const auth = await getAtolyeAuth();
  if (!auth?.atolyeId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID anahtarları eksik" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

  const [atolye, personelTokens] = await Promise.all([
    prisma.atolye.findUnique({
      where: { id: auth.atolyeId },
      include: { user: { include: { pushTokens: true } } },
    }),
    prisma.personelPushToken.findMany({ where: { atolyeId: auth.atolyeId } }),
  ]);

  const adminTokens = atolye?.user?.pushTokens?.map((t: any) => t.token) ?? [];
  const pTokens = personelTokens.map((t: any) => t.token);
  const allTokens = [...adminTokens, ...pTokens];

  if (allTokens.length === 0) {
    return NextResponse.json(
      { error: "Kayıtlı subscription yok — önce bildirimleri açın." },
      { status: 404 }
    );
  }

  const payload = JSON.stringify({
    title: "Metrix Test",
    body: "Push bildirimi çalışıyor ✓",
    url: "/dashboard",
  });

  const results = await Promise.allSettled(
    allTokens.map(async (raw) => {
      const sub = JSON.parse(raw) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      if (!sub?.endpoint || !sub?.keys?.p256dh) {
        throw new Error("geçersiz subscription (eski FCM token)");
      }
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        payload
      );
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "bilinmeyen hata");

  return NextResponse.json({ ok: true, sent, failed: errors.length, errors, total: allTokens.length });
}
