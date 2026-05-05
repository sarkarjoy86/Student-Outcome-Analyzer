import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured in environment variables.')
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || 'obisystem',
  })

  isConnected = true
}
