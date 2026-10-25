import env from '../config/env.js';
import logger from '../utils/logger.js';

let customSmsProvider = null;

export function registerSmsProvider(providerFn) {
  customSmsProvider = providerFn;
}

/**
 * Sends an SMS message. Falls back to logging in console or executes custom registered provider.
 */
export async function sendSms({ to, message }) {
  if (customSmsProvider) {
    return customSmsProvider({ to, message });
  }

  logger.info(`[SMS to ${to}]: ${message}`);
  return { success: true, mocked: true, provider: env.SMS_PROVIDER };
}

export default {
  sendSms,
  registerSmsProvider,
};
