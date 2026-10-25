import { z } from 'zod';
import { CURRENCIES } from '../utils/constants.js';

export const updateSettingsSchema = z.object({
  body: z.object({
    platformCommissionPercent: z.number().min(0).max(100).optional(),
    allowMixedGroups: z.boolean().optional(),
    enforceGenderMatch: z.boolean().optional(),
    minAgeForOwnAccount: z.number().min(5).max(21).optional(),
    subscriptionGraceDays: z.number().min(0).max(30).optional(),
    minSessionsBeforeReview: z.number().min(1).max(50).optional(),
    chatEditWindowMinutes: z.number().min(1).max(1440).optional(),
    supportedCurrencies: z.array(z.enum(CURRENCIES)).optional(),
    maintenanceMode: z.boolean().optional(),
  }),
});
