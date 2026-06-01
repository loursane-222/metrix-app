import jwt from 'jsonwebtoken'
import { getJwtSecret } from "@/lib/env";

const SECRET = getJwtSecret()

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
