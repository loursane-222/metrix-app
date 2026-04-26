const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function n(v){ return Number(v || 0); }

async function main(){
  const isler = await prisma.is.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      teklifNo: true,
      musteriAdi: true,
      urunAdi: true,
      metrajMtul: true,
      tezgahArasiMtul: true,
      adaTezgahMtul: true,
      satisFiyati: true,
    }
  });

  for (const i of isler) {
    const tezgah = n(i.metrajMtul);
    const arasi = n(i.tezgahArasiMtul);
    const ada = n(i.adaTezgahMtul);
    const satis = n(i.satisFiyati);
    const weighted = tezgah * 1 + arasi * 0.75 + ada * 1.5;
    const baz = weighted > 0 ? satis / weighted : 0;

    console.log({
      teklifNo: i.teklifNo,
      musteri: i.musteriAdi,
      urun: i.urunAdi,
      tezgah,
      tezgahArasi: arasi,
      ada,
      satis,
      bazBirim: Math.round(baz),
      tezgahArasiBirim: Math.round(baz * 0.75),
      adaBirim: Math.round(baz * 1.5),
      onlineUrl: `http://localhost:3000/teklif/${i.teklifNo}`
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
