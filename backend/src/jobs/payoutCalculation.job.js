import cron from 'node-cron';
import { calculateMonthlyPayouts } from '../services/payout.service.js';
import { previousPeriod } from '../utils/time.js';
import logger from '../utils/logger.js';

/**
 * Runs on the 1st day of every month at 02:00 UTC
 * to automatically compute earnings for the prior month.
 */
export function initPayoutCalculationJob() {
  return cron.schedule('0 2 1 * *', async () => {
    try {
      const period = previousPeriod();
      logger.info(`Starting automatic monthly payout calculation for period ${period}`);
      const payouts = await calculateMonthlyPayouts(period);
      logger.info(`Calculated ${payouts.length} teacher payouts for period ${period}`);
    } catch (err) {
      logger.error(`Payout calculation cron job error: ${err.message}`);
    }
  });
}

export default initPayoutCalculationJob;
