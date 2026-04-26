import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID eksik" }, { status: 400 });
    }

    const kayit = await prisma.is.findUnique({
      where: { id },
    });

    if (!kayit) {
      return Response.json({ error: "İş bulunamadı" }, { status: 404 });
    }

    return Response.json(kayit);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
