import { prisma } from "@/lib/prisma";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function pushToAtolye(atolyeId: string, payload: PushPayload): Promise<void> {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

  const [atolye, personelTokenRecs] = await Promise.all([
    prisma.atolye.findUnique({
      where: { id: atolyeId },
      include: { user: { include: { pushTokens: true } } },
    }),
    prisma.personelPushToken.findMany({ where: { atolyeId } }),
  ]);

  const adminRecs = (atolye?.user?.pushTokens ?? []).map((t: any) => ({
    id: t.id as string,
    raw: t.token as string,
    isPersonel: false,
  }));
  const personelRecs = personelTokenRecs.map((t: any) => ({
    id: t.id as string,
    raw: t.token as string,
    isPersonel: true,
  }));
  const allRecs = [...adminRecs, ...personelRecs];

  if (allRecs.length === 0) return;

  const pushPayload = JSON.stringify({ ...payload, url: payload.url ?? "/dashboard" });

  await Promise.allSettled(
    allRecs.map(async (rec) => {
      let sub: { endpoint: string; keys: { p256dh: string; auth: string } };
      try {
        sub = JSON.parse(rec.raw);
      } catch {
        return; // old FCM opaque token — not valid VAPID JSON
      }
      if (!sub?.endpoint || !sub?.keys?.p256dh) return;

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          pushPayload
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Subscription expired — remove to avoid future noise
          try {
            if (rec.isPersonel) {
              await prisma.personelPushToken.delete({ where: { id: rec.id } });
            } else {
              await prisma.pushToken.delete({ where: { id: rec.id } });
            }
            console.log("[push] removed expired token:", rec.id);
          } catch {
            // ignore — token may have been deleted concurrently
          }
        } else {
          console.error("[push] sendNotification failed:", err?.statusCode, err?.message);
        }
      }
    })
  );
}
