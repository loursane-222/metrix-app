import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set('metrix-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  })

  return response
}
