import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const sifreliParola = await bcrypt.hash('metrix123', 10)

  const kullanici = await prisma.user.upsert({
    where: { email: 'admin@metrix.com' },
    update: {},
    create: {
      email: 'admin@metrix.com',
      password: sifreliParola,
    },
  })

  console.log('Kullanıcı oluşturuldu:', kullanici.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })