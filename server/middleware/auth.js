import User from '../models/User.js'
import { connectDB } from '../lib/db.js'
import { getTokenFromRequest, verifyAuthToken } from '../utils/auth.js'

export async function requireAuth(req, res, next) {
  try {
    await connectDB()

    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ message: 'Unauthorized' })

    const decoded = verifyAuthToken(token)
    const user = await User.findById(decoded.userId).select(
      '_id fullName email role isLoggedIn lastLoginAt createdAt'
    )
    if (!user) return res.status(401).json({ message: 'Unauthorized' })

    req.user = user
    return next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}
