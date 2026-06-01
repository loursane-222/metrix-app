import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { normalizePlan } from "@/lib/subscription/plans";

const MENU_YETKI_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/isler": "teklifOlusturabilir",
  "/dashboard/musteriler": "musteriGorebilir",
  "/dashboard/is-programi": "isProgramiGorebilir",
  "/dashboard/stok": "maliyetGorebilir",
  "/dashboard/atolye": "atolyeAyarGorebilir",
  "/dashboard/personel": "atolyeAyarGorebilir",
  "/dashboard/plaka-planlayici": "teklifOlusturabilir",
  "/dashboard/tahsilatlar": "maliyetGorebilir",
};

async function getPersonelMenuleri(personelId: string): Promise<string[]> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
      personelId
    );
    const yetki = rows[0];

    // Yetki kaydı yoksa sadece dashboard
    if (!yetki) return ["/dashboard", "/dashboard/is-programi"];

    const allowed = ["/dashboard"];

    if (yetki.isProgramiGorebilir) allowed.push("/dashboard/is-programi");
    if (yetki.teklifOlusturabilir) allowed.push("/dashboard/isler");
    if (yetki.teklifOlusturabilir) allowed.push("/dashboard/plaka-planlayici");
    if (yetki.musteriGorebilir) allowed.push("/dashboard/musteriler");
    if (yetki.maliyetGorebilir) allowed.push("/dashboard/stok");
    if (yetki.maliyetGorebilir) allowed.push("/dashboard/tahsilatlar");
    if (yetki.atolyeAyarGorebilir) allowed.push("/dashboard/atolye");
    if (yetki.atolyeAyarGorebilir) allowed.push("/dashboard/personel");

    return allowed;
  } catch {
    return ["/dashboard", "/dashboard/is-programi"];
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("metrix-token")?.value;

    if (!token) {
      return NextResponse.json({ userId: null }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);
    const role = (payload as any).role || "admin";

    if (role === "personel") {
      const personelId = (payload as any).personelId || null;
      const atolyeId = (payload as any).atolyeId || null;
      const owner = await prisma.user.findUnique({
        where: { id: payload.id as string },
        select: { aktif: true, abonelikBitis: true, abonelikPlani: true },
      });

      const allowedMenus = personelId
        ? await getPersonelMenuleri(personelId)
        : ["/dashboard"];

      return NextResponse.json({
        userId: (payload as any).id,
        email: (payload as any).email,
        role,
        personelId,
        atolyeId,
        aktif: owner?.aktif ?? true,
        abonelikBitis: owner?.abonelikBitis ?? null,
        abonelikPlani: normalizePlan(owner?.abonelikPlani),
        allowedMenus,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { atolye: true },
    });

    if (!user) {
      return NextResponse.json({ userId: null }, { status: 401 });
    }

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

    const simdi = new Date();
    const abonelikBitis = user.abonelikBitis;
    const abonelikPlani = normalizePlan((user as any).abonelikPlani);
    const demoBitti = abonelikBitis ? abonelikBitis < simdi : true;

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      role: "admin",
      aktif: user.aktif,
      abonelikBitis: user.abonelikBitis,
      abonelikPlani,
      demoBitti,
      atolyeId: atolye.id,
      allowedMenus: null, // admin tüm menüleri görür
    });
  } catch (e) {
    console.error("current-user error:", e);
    return NextResponse.json({ userId: null }, { status: 401 });
  }
}
