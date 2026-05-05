import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'auth_token'
const TOKEN_EXPIRY = '7d'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function signAuthToken(payload) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured.')
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY })
}

export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured.')
  return jwt.verify(token, secret)
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
  return req.cookies?.[COOKIE_NAME]
}
