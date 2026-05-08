import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export type AtolyeAuth = {
  atolyeId: string;
  userId: string;
  role: "admin" | "personel";
  personelId?: string;
};

export async function getAtolyeAuth(): Promise<AtolyeAuth | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("metrix-token")?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    const p = payload as any;

    // Personel girişi — atolyeId token'da gömülü
    if (p.role === "personel") {
      if (!p.atolyeId) return null;
      return {
        atolyeId: p.atolyeId,
        userId: p.id,
        role: "personel",
        personelId: p.personelId || undefined,
      };
    }

    // Admin girişi — userId ile atolye bul
    const user = await prisma.user.findUnique({
      where: { id: p.id },
      include: { atolye: true },
    });
    if (!user) return null;

    let atolye = user.atolye;
    if (!atolye) {
      atolye = await prisma.atolye.create({
        data: {
          userId: user.id,
          atolyeAdi: user.ad ? `${user.ad} Atölyesi` : "Yeni Atölye",
          email: user.email,
        },
      });
    }

    return {
      atolyeId: atolye.id,
      userId: user.id,
      role: "admin",
    };
  } catch {
    return null;
  }
}

// Sadece atolyeId lazımsa shortcut
export async function getAtolyeId(): Promise<string | null> {
  const auth = await getAtolyeAuth();
  return auth?.atolyeId ?? null;
}
