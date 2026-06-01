import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { sseEmitter } from "@/lib/sseEmitter";
import { getJwtSecretBytes } from "@/lib/env";

async function getAtolyeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    if ((payload as any).role === "personel") return (payload as any).atolyeId || null;
    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });
    return user?.atolye?.id || null;
  } catch { return null; }
}

export async function GET() {
  const atolyeId = await getAtolyeId();
  if (!atolyeId) return new Response("Yetkisiz", { status: 401 });

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(ctrl) {
      // Bağlantı mesajı
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Bu atölye için aktivite dinle
      const handler = (data: object) => {
        try {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      sseEmitter.on(`activity:${atolyeId}`, handler);

      // Keepalive — bağlantı kopmasın
      intervalId = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(intervalId);
        }
      }, 20000);

      // Cleanup
      const cleanup = () => {
        sseEmitter.off(`activity:${atolyeId}`, handler);
        clearInterval(intervalId);
      };

      // Stream iptal edildiğinde temizle
      (ctrl as any)._cleanup = cleanup;
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
