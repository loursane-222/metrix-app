import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

async function kullaniciAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string; email: string }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const formData = await req.formData()
  const dosya = formData.get('logo') as File

  if (!dosya) return NextResponse.json({ hata: 'Dosya bulunamadı.' }, { status: 400 })

  const bytes = await dosya.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const dosyaAdi = `logo-${kullanici.id}${path.extname(dosya.name)}`
  const dosyaYolu = path.join(uploadDir, dosyaAdi)
  await writeFile(dosyaYolu, buffer)

  const logoUrl = `/uploads/${dosyaAdi}`

  await prisma.atolye.update({
    where: { userId: kullanici.id },
    data: { logoUrl },
  })

  return NextResponse.json({ logoUrl })
}