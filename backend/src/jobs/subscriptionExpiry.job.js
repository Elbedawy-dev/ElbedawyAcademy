import cron from 'node-cron';
import Enrollment from '../models/Enrollment.js';
import Group from '../models/Group.js';
import Settings from '../models/Settings.js';
import { sendNotificationToUser } from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * Runs daily at 01:00 UTC to evaluate subscription expiries and grace periods.
 */
export function initSubscriptionExpiryJob() {
  return cron.schedule('0 1 * * *', async () => {
    try {
      const now = new Date();
      const settings = await Settings.getSettings();
      const graceDays = settings.subscriptionGraceDays || 3;

      // 1. Notify subscriptions expiring within 3 days
      const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const expiringSoon = await Enrollment.find({
        status: 'active',
        'subscription.status': 'active',
        'subscription.endDate': { $gte: now, $lte: threeDaysAhead },
      }).populate('group', 'name');

      for (const enr of expiringSoon) {
        sendNotificationToUser(enr.student, {
          type: 'subscription_expiring',
          data: {
            groupName: enr.group?.name || 'المجموعة',
            days: 3,
          },
        }).catch(() => {});
      }

      // 2. Mark expired past grace period
      const graceThreshold = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);
      const expiredEnrollments = await Enrollment.find({
        status: 'active',
        'subscription.status': { $in: ['active', 'grace'] },
        'subscription.endDate': { $lt: graceThreshold },
      }).populate('group', 'name');

      for (const enr of expiredEnrollments) {
        enr.subscription.status = 'expired';
        await enr.save();

        sendNotificationToUser(enr.student, {
          type: 'subscription_expired',
          data: {
            groupName: enr.group?.name || 'المجموعة',
          },
        }).catch(() => {});
      }
    } catch (err) {
      logger.error(`Subscription expiry cron job error: ${err.message}`);
    }
  });
}

export default initSubscriptionExpiryJob;
