import { prisma } from "@/lib/prisma";
import { isCriticalNotificationEvent } from "@/lib/notificationCatalog";

export type NotificationRecipient =
  | {
      recipientType: "OWNER";
      userId: string;
      personelId?: null;
      name?: string | null;
    }
  | {
      recipientType: "PATRON";
      userId?: string | null;
      personelId: string;
      name: string;
    };

function recipientKey(recipient: NotificationRecipient) {
  return recipient.recipientType === "OWNER"
    ? `user:${recipient.userId}`
    : `personel:${recipient.personelId}`;
}

export async function resolvePatronRecipients(atolyeId: string) {
  const [atolye, patronPersoneller] = await Promise.all([
    prisma.atolye.findUnique({
      where: { id: atolyeId },
      select: {
        user: {
          select: {
            id: true,
            ad: true,
          },
        },
      },
    }),
    prisma.personel.findMany({
      where: {
        atolyeId,
        aktif: true,
        isPatron: true,
      },
      select: {
        id: true,
        ad: true,
        soyad: true,
        userId: true,
      },
      orderBy: [{ ad: "asc" }, { soyad: "asc" }],
    }),
  ]);

  const recipients: NotificationRecipient[] = [];

  if (atolye?.user?.id) {
    recipients.push({
      recipientType: "OWNER",
      userId: atolye.user.id,
      personelId: null,
      name: atolye.user.ad,
    });
  }

  for (const personel of patronPersoneller) {
    recipients.push({
      recipientType: "PATRON",
      userId: personel.userId,
      personelId: personel.id,
      name: `${personel.ad}${personel.soyad ? " " + personel.soyad : ""}`.trim(),
    });
  }

  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const key = recipientKey(recipient);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function resolvePatronRecipientsForEvent(atolyeId: string, eventType: string) {
  if (!isCriticalNotificationEvent(eventType)) return [];
  return resolvePatronRecipients(atolyeId);
}
