import mongoose from 'mongoose'
import dotenv from 'dotenv'
import dns from 'dns'
import RecentActivity from './models/RecentActivity.js'
import CourseOffering from './models/CourseOffering.js'
import User from './models/User.js'
import { logActivity } from './utils/activityLogger.js'

dotenv.config()
dns.setServers(['8.8.8.8', '8.8.4.4'])

async function testActivities() {
  console.log('Connecting to database...')
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/'
  const dbName = process.env.MONGODB_DB_NAME || 'obe_attainment'
  await mongoose.connect(mongoUri, { dbName })
  console.log('Connected!')

  try {
    // 1. Fetch a course offering
    const offering = await CourseOffering.findOne()
    if (!offering) {
      console.log('No CourseOfferings found in DB to attach activity to. Skipping test.')
      return
    }

    // 2. Fetch a user/teacher
    const teacher = await User.findOne()
    const teacherId = teacher ? teacher._id : new mongoose.Types.ObjectId()

    console.log(`Testing logActivity with offeringId: ${offering._id}, teacherId: ${teacherId}`)

    // 3. Clear existing logs for this test
    await RecentActivity.deleteMany({ action: 'TEST_ACTION_XYZ' })

    // 4. Log activity
    await logActivity(offering._id, teacherId, 'TEST_ACTION_XYZ', 'Verification helper logged a test action successfully')

    // 5. Query log
    const activities = await RecentActivity.find({ courseOfferingId: offering._id, action: 'TEST_ACTION_XYZ' })
    console.log('Found logged activities count:', activities.length)
    if (activities.length > 0) {
      console.log('Successfully logged activity info:', activities[0].description)
      console.log('SUCCESS: RecentActivity logging works perfectly in the database!')
    } else {
      throw new Error('FAILED: Mapped activity was not found in the collection!')
    }

    // 6. Clean up
    await RecentActivity.deleteMany({ action: 'TEST_ACTION_XYZ' })
    console.log('Test clean up completed.')

  } catch (error) {
    console.error('Test failed with error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from database.')
  }
}

testActivities()
