import mongoose from 'mongoose'
import dns from 'dns'

// Force Google Public DNS – the local resolver may refuse SRV queries
// which are required by the mongodb+srv:// connection string.
dns.setServers(['8.8.8.8', '8.8.4.4'])

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
