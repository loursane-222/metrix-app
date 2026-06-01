import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@/lib/env";

async function getAtolyeId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    if ((payload as any).role === "personel") return (payload as any).atolyeId || null;
    const user = await prisma.user.findUnique({ where: { id: (payload as any).id }, include: { atolye: true } });
    return user?.atolye?.id || null;
  } catch { return null; }
}

export async function GET(req: Request) {
  try {
    const atolyeId = await getAtolyeId();
    if (!atolyeId) return Response.json({ error: "Yetkisiz." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID eksik" }, { status: 400 });

    const kayit = await prisma.is.findFirst({ where: { id, atolyeId } });
    if (!kayit) return Response.json({ error: "İş bulunamadı" }, { status: 404 });

    return Response.json(kayit);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
