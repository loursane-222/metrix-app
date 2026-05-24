import { prisma } from "./prisma";

interface LogParams {
  atolyeId: string;
  userId?: string;
  personelId?: string;
  type: string;
  message: string;
  refId?: string;
}

async function pushToAtolye(atolyeId: string, message: string) {
  try {
    const webpush = (await import("web-push")).default;
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;

    webpush.setVapidDetails("mailto:info@metrixtezgah.com", publicKey, privateKey);

    const atolye = await prisma.atolye.findUnique({
      where: { id: atolyeId },
      include: { user: { include: { pushTokens: true } } },
    });

    const personelTokens = await prisma.personelPushToken.findMany({
      where: { atolyeId },
    });

    const adminTokens = atolye?.user?.pushTokens?.map((t: any) => t.token) || [];
    const pTokens = personelTokens.map((t: any) => t.token);
    const allTokens = [...adminTokens, ...pTokens];

    if (allTokens.length === 0) return;

    const payload = JSON.stringify({
      title: "Metrix",
      body: message,
      url: "/dashboard",
    });

    await Promise.allSettled(
      allTokens.map(async (raw) => {
        try {
          const sub = JSON.parse(raw) as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          };
          if (!sub?.endpoint || !sub?.keys?.p256dh) return; // skip old FCM tokens
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload
          );
        } catch {
          // skip invalid or expired subscriptions
        }
      })
    );
  } catch (e) {
    console.error("pushToAtolye error:", e);
  }
}

export async function logActivity(params: LogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        atolyeId: params.atolyeId,
        userId: params.userId,
        personelId: params.personelId,
        type: params.type,
        message: params.message,
        refId: params.refId,
      },
    });

    // Notification tablosuna yaz (atolyeId ile — firma izolasyonu sağlanmış)
    await prisma.notification.create({
      data: {
        atolyeId: params.atolyeId,
        type: params.type,
        title: "Metrix",
        description: params.message,
        actionUrl: "/dashboard",
        isRead: false,
      },
    });

    // Push gönder
    await pushToAtolye(params.atolyeId, params.message);
  } catch (e) {
    console.error("logActivity error:", e);
  }
}
