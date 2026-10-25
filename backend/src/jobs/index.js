import env from '../config/env.js';
import logger from '../utils/logger.js';
import { initSessionReminderJob } from './sessionReminder.job.js';
import { initSubscriptionExpiryJob } from './subscriptionExpiry.job.js';
import { initPayoutCalculationJob } from './payoutCalculation.job.js';

export function startCronJobs() {
  if (!env.ENABLE_CRON || env.isTest) {
    logger.info('Cron jobs disabled by configuration');
    return [];
  }

  logger.info('Initializing automated background cron jobs');
  const jobs = [
    initSessionReminderJob(),
    initSubscriptionExpiryJob(),
    initPayoutCalculationJob(),
  ];

  return jobs;
}

export default startCronJobs;
