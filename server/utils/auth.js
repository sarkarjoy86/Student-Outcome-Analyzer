import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'auth_token'
const TOKEN_EXPIRY = '7d'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const JWT_SECRET = process.env.JWT_SECRET || 'obe_system_jwt_secret_key_2026_default'

export function signAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export function getTokenFromRequest(req) {
  // First check Authorization header (for cross-domain/GitHub Pages)
  const authHeader = req.headers?.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // Fallback to cookie (for local dev)
  return req.cookies?.[COOKIE_NAME]
}
