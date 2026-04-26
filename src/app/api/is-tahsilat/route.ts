import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { id, tahsilat } = await req.json();

    if (!id) {
      return Response.json({ error: "ID gerekli" }, { status: 400 });
    }

    const updated = await prisma.is.update({
      where: { id },
      data: {
        tahsilat: String(tahsilat || 0),
      },
    });

    return Response.json({ ok: true, data: updated });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
