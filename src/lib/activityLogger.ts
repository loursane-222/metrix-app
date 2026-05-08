import { prisma } from "@/lib/prisma";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const ADMIN_TYPES = [
  "satis", "tahsilat", "odeme", "teklif_onay", "teklif_kayip",
  "teklif_onayla", "teklif_kaybedildi", "odeme_hatirlatma",
  "yeni_is", "is_onaylandi", "is_kaybedildi", "teklif_olusturuldu",
  "musteri_eklendi",
];

const PERSONEL_TYPES = [
  "olcu", "imalat", "montaj", "faz_tamamlandi", "personel_atama",
];

const BOTH_TYPES = [
  "takvim_guncellendi", "schedule", "faz_atama",
  "program_tarih_degisti", "program_personel_degisti", "program_not_eklendi",
];

function getTargetRole(type: string): "admin" | "personel" | "both" {
  const t = type.toLowerCase();
  if (BOTH_TYPES.some((k) => t.includes(k))) return "both";
  if (ADMIN_TYPES.some((k) => t.includes(k))) return "admin";
  if (PERSONEL_TYPES.some((k) => t.includes(k))) return "personel";
  return "both";
}

function getActionUrl(type: string, refId?: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || ""
  const t = type.toLowerCase();
  if (t.includes("teklif") || t.includes("is_onay") || t.includes("is_kayip") || t.includes("yeni_is")) {
    return refId ? `${base}/dashboard/isler/${refId}` : `${base}/dashboard/isler`;
  }
  if (t.includes("tahsilat") || t.includes("odeme")) {
    return `${base}/dashboard/musteriler`;
  }
  if (t.includes("takvim") || t.includes("schedule") || t.includes("faz")) {
    return `${base}/dashboard/is-programi`;
  }
  if (t.includes("musteri")) {
    return `${base}/dashboard/musteriler`;
  }
  return `${base}/dashboard`;
}

let _accessToken: { token: string; expiry: number } | null = null;

async function getFCMAccessToken(): Promise<string | null> {
  try {
    const now = Date.now();
    if (_accessToken && _accessToken.expiry > now + 60000) {
      return _accessToken.token;
    }
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!keyPath) return null;
    const absPath = path.resolve(process.cwd(), keyPath);
    const auth = new GoogleAuth({
      keyFile: absPath,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;
    if (!token) return null;
    _accessToken = { token, expiry: now + 3600000 };
    return token;
  } catch (e) {
    console.error("FCM access token alınamadı:", e);
    return null;
  }
}

async function sendFCMV1Push(tokens: string[], title: string, body: string, actionUrl: string) {
  if (tokens.length === 0) return;
  const accessToken = await getFCMAccessToken();
  if (!accessToken) {
    console.warn("FCM access token yok — push gönderilemiyor");
    return;
  }
  const projectId = "satisyon-41ea3";
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  await Promise.allSettled(
    tokens.map((token) =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            data: { actionUrl },
            notification: { title, body },
            webpush: {
              notification: {
                title,
                body,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                vibrate: [200, 100, 200],
                requireInteraction: true,
              },
              fcm_options: { link: actionUrl },
            },
          },
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          console.error("FCM V1 hata:", err);
        }
      })
    )
  );
}

async function sendPushByRole(
  atolyeId: string,
  title: string,
  body: string,
  role: "admin" | "personel" | "both",
  actionUrl: string
) {
  try {
    if (role === "admin" || role === "both") {
      const atolye = await prisma.atolye.findUnique({
        where: { id: atolyeId },
        select: { userId: true },
      });
      if (atolye?.userId) {
        const tokens = await prisma.pushToken.findMany({
          where: { userId: atolye.userId },
          select: { token: true },
        });
        await sendFCMV1Push(tokens.map((t) => t.token), title, body, actionUrl);
      }
    }
    if (role === "personel" || role === "both") {
      const tokens = await prisma.personelPushToken.findMany({
        where: { atolyeId },
        select: { token: true },
      });
      await sendFCMV1Push(tokens.map((t) => t.token), title, body, actionUrl);
    }
  } catch (e) {
    console.error("Push gönderilemedi:", e);
  }
}

export async function logActivity({
  atolyeId,
  type,
  message,
  refId,
  userId,
  personelId,
}: {
  atolyeId: string;
  type: string;
  message: string;
  refId?: string;
  userId?: string;
  personelId?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        atolyeId,
        type,
        message,
        refId: refId || null,
        userId: userId || null,
        personelId: personelId || null,
      },
    });

    const role = getTargetRole(type);
    const actionUrl = getActionUrl(type, refId);
    await sendPushByRole(atolyeId, "Metrix", message, role, actionUrl);
  } catch (e) {
    console.error("logActivity hatası:", e);
  }
}
