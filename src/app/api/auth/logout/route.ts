import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ mesaj: 'Çıkış yapıldı.' })
  response.cookies.delete('metrix-token')
  return response
}