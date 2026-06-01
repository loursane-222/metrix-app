import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getJwtSecretBytes } from "@/lib/env";
import {
  getPlanLabel,
  hasSubscriptionAccess,
  normalizePlan,
  type SubscriptionPlan,
} from "@/lib/subscription/plans";

type AuthenticatedUser = {
  userId: string;
  email?: string;
  role: "admin" | "personel";
  personelId?: string | null;
  atolyeId?: string | null;
  abonelikPlani: SubscriptionPlan;
  abonelikBitis: Date | null;
  aktif: boolean;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  const { payload } = await jwtVerify(token, getJwtSecretBytes());
  const userId = payload.id as string | undefined;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      aktif: true,
      abonelikPlani: true,
      abonelikBitis: true,
      atolye: { select: { id: true } },
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    role: ((payload as any).role || "admin") === "personel" ? "personel" : "admin",
    personelId: ((payload as any).personelId as string | undefined) || null,
    atolyeId: ((payload as any).atolyeId as string | undefined) || user.atolye?.id || null,
    aktif: user.aktif,
    abonelikPlani: normalizePlan(user.abonelikPlani),
    abonelikBitis: user.abonelikBitis,
  };
}

export async function requirePlan(minPlan: SubscriptionPlan) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ hata: "Yetkisiz." }, { status: 401 }),
    };
  }

  if (!user.aktif) {
    return {
      ok: false as const,
      response: NextResponse.json({ hata: "Hesap aktif değil." }, { status: 403 }),
    };
  }

  if (user.abonelikBitis && user.abonelikBitis < new Date()) {
    return {
      ok: false as const,
      response: NextResponse.json({ hata: "Abonelik süresi dolmuş." }, { status: 402 }),
    };
  }

  if (!hasSubscriptionAccess(user.abonelikPlani, minPlan, user.abonelikBitis)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { hata: `Bu özellik ${getPlanLabel(minPlan)} paketinde.` },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user };
}
