import cron from 'node-cron';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import { sendNotificationToUser } from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * Runs every 10 minutes: checks for classes starting in ~30 minutes
 * and notifies enrolled students.
 */
export function initSessionReminderJob() {
  return cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

      const upcomingSessions = await Session.find({
        status: 'scheduled',
        scheduledStart: { $gte: windowStart, $lte: windowEnd },
      });

      for (const session of upcomingSessions) {
        const enrollments = await Enrollment.find({
          group: session.group,
          status: 'active',
        }).select('student');

        for (const enr of enrollments) {
          sendNotificationToUser(enr.student, {
            type: 'session_reminder',
            data: {
              sessionTitle: session.title,
              minutes: 30,
            },
          }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error(`Session reminder cron job error: ${err.message}`);
    }
  });
}

export default initSessionReminderJob;
