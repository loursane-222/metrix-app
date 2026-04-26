import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const makineler = await prisma.makine.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        makineAdi: true,
        dakikalikMaliyet: true,
      },
    });

    return Response.json({ makineler });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
