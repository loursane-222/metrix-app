import { prisma } from "@/lib/prisma";

const ADMIN_TYPES = [
  "satis", "tahsilat", "odeme", "teklif_onay", "teklif_kayip",
  "teklif_onayla", "teklif_kaybedildi", "odeme_hatirlatma",
  "yeni_is", "is_onaylandi", "is_kaybedildi",
];

const PERSONEL_TYPES = [
  "olcu", "imalat", "montaj", "takvim", "gorev", "faz",
  "schedule", "phase", "atama", "personel_gorev",
];

function getTargetRole(type: string): "admin" | "personel" | "both" {
  const t = type.toLowerCase();
  const isAdmin = ADMIN_TYPES.some((k) => t.includes(k));
  const isPersonel = PERSONEL_TYPES.some((k) => t.includes(k));
  if (isAdmin && isPersonel) return "both";
  if (isAdmin) return "admin";
  if (isPersonel) return "personel";
  return "both";
}

async function sendFCMPush(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  if (!serverKey) return;

  await Promise.allSettled(
    tokens.map((token) =>
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body },
          webpush: {
            notification: { title, body, icon: "/icon-192.png" },
          },
        }),
      })
    )
  );
}

async function sendPushByRole(
  atolyeId: string,
  title: string,
  body: string,
  role: "admin" | "personel" | "both"
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
        await sendFCMPush(tokens.map((t) => t.token), title, body);
      }
    }

    if (role === "personel" || role === "both") {
      const tokens = await prisma.personelPushToken.findMany({
        where: { atolyeId },
        select: { token: true },
      });
      await sendFCMPush(tokens.map((t) => t.token), title, body);
    }
  } catch {
    // push hataları sessizce geçsin
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
    await sendPushByRole(atolyeId, "Metrix", message, role);
  } catch {
    // log hataları sessizce geçsin
  }
}
