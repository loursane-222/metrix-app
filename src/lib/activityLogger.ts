import { prisma } from "@/lib/prisma";

// Hangi activity type'ları hangi role gider
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
  // bilinmeyen → admin
  return "admin";
}

async function sendPushToAtolyeByRole(
  atolyeId: string,
  title: string,
  body: string,
  role: "admin" | "personel" | "both"
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Her iki role de gönder
    if (role === "admin" || role === "both") {
      // Atölyenin sahibi (User) → admin tokenları
      const atolye = await prisma.atolye.findUnique({
        where: { id: atolyeId },
        select: { userId: true },
      });
      if (atolye?.userId) {
        await fetch(`${baseUrl}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            userIds: [atolye.userId],
          }),
        }).catch(() => {});
      }
    }

    if (role === "personel" || role === "both") {
      // Atölyedeki tüm aktif personel push tokenları
      const tokens = await prisma.personelPushToken.findMany({
        where: { atolyeId },
      });
      if (tokens.length > 0) {
        await fetch(`${baseUrl}/api/push/send-personel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            tokens: tokens.map((t) => t.token),
          }),
        }).catch(() => {});
      }
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

    // Push bildirim gönder
    const role = getTargetRole(type);
    await sendPushToAtolyeByRole(atolyeId, "Metrix", message, role);
  } catch {
    // log hataları sessizce geçsin
  }
}
