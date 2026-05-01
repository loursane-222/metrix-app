import { prisma } from "@/lib/prisma";

type NotificationInput = {
  type?: string;
  title: string;
  description?: string;
  actionUrl: string;
};

export async function createNotificationSafe(input: NotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        type: input.type ?? "INFO",
        title: input.title,
        description: input.description,
        actionUrl: input.actionUrl,
      },
    });
  } catch (error) {
    console.error("Notification create error:", error);
    return null;
  }
}
