import RecentActivity from '../models/RecentActivity.js'

export async function logActivity(courseOfferingId, teacherId, action, description) {
  try {
    if (!courseOfferingId || !teacherId) {
      console.warn('Logging skipped: courseOfferingId or teacherId missing', { courseOfferingId, teacherId })
      return
    }
    await RecentActivity.create({
      courseOfferingId,
      teacherId,
      action,
      description
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
