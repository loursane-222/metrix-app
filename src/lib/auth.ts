import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024'

export function tokenOlustur(kullaniciId: string, email: string) {
  return jwt.sign(
    { id: kullaniciId, email },
    SECRET,
    { expiresIn: '7d' }
  )
}

export function tokenDogrula(token: string) {
  try {
    return jwt.verify(token, SECRET) as { id: string; email: string }
  } catch {
    return null
  }
}