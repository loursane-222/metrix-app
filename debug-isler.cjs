const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const isler = await prisma.is.findMany({
    select: {
      id: true,
      teklifNo: true,
      musteriAdi: true,
      urunAdi: true,
      durum: true,
      workSchedule: { select: { id: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  console.log("\n=== TÜM SON İŞLER ===\n");
  for (const i of isler) {
    console.log({
      id: i.id,
      teklifNo: i.teklifNo,
      musteri: i.musteriAdi,
      urun: i.urunAdi,
      durum: i.durum,
      programVarMi: !!i.workSchedule,
    });
  }

  const uygun = isler.filter(i => {
    const d = String(i.durum || '').toLocaleLowerCase('tr-TR').trim();
    return !i.workSchedule && ['onaylandi', 'onaylandı', 'onay'].includes(d);
  });

  console.log("\n=== ONAYLI + PROGRAMSIZ ADAYLAR ===\n");
  console.log(uygun.map(i => ({
    teklifNo: i.teklifNo,
    musteri: i.musteriAdi,
    durum: i.durum,
    programVarMi: !!i.workSchedule,
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
