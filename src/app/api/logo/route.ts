import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { v2 as cloudinary } from 'cloudinary'

const prisma = new PrismaClient()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

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

  const sonuc = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'metrix-logolar',
        public_id: `logo-${kullanici.id}`,
        overwrite: true,
        transformation: [{ width: 400, height: 200, crop: 'fit' }],
      },
      (hata, sonuc) => {
        if (hata) reject(hata)
        else resolve(sonuc as { secure_url: string })
      }
    ).end(buffer)
  })

  const logoUrl = sonuc.secure_url

  await prisma.atolye.update({
    where: { userId: kullanici.id },
    data: { logoUrl },
  })

  return NextResponse.json({ logoUrl })
}