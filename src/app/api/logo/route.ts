import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { v2 as cloudinary } from 'cloudinary'


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const formData = await req.formData()
  const dosya = formData.get('logo') as File

  if (!dosya) return NextResponse.json({ hata: 'Dosya bulunamadı.' }, { status: 400 })

  const bytes = await dosya.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const sonuc = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'metrix-logolar',
        public_id: `logo-${auth.userId}`,
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
    where: { userId: auth.userId },
    data: { logoUrl },
  })

  return NextResponse.json({ logoUrl })
}