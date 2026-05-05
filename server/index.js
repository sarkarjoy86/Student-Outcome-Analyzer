import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { connectDB } from './lib/db.js'
import authRoutes from './routes/authRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Allow multiple origins: local dev + GitHub Pages
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://sarkarjoy86.github.io',
]

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use('/api/auth', authRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

async function bootstrapDatabase() {
  try {
    await connectDB()
    console.log('MongoDB connected.')
  } catch (error) {
    console.error('Failed to connect DB:', error.message)
    console.error('Backend will keep running. Fix Atlas access and save a file to retry.')
  }
}

bootstrapDatabase()
