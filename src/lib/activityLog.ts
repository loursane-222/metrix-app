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
      notification: {
        title: "Metrix",
        body: message,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      },
      data: { actionUrl: "/dashboard" },
    });

    await Promise.allSettled(
      allTokens.map(async (token) => {
        try {
          // PushToken formatını parse et
          const parsed = JSON.parse(token);
          await webpush.sendNotification(
            { endpoint: parsed.endpoint, keys: { p256dh: parsed.p256dh, auth: parsed.auth } },
            payload
          );
        } catch {
          // Token formatı farklıysa direkt dene
          await webpush.sendNotification({ endpoint: token, keys: { p256dh: "", auth: "" } }, payload).catch(() => {});
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
