import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', settingsController.getSettings);
router.patch('/', validate(updateSettingsSchema), settingsController.updateSettings);
router.get('/audit-logs', settingsController.listAuditLogs);
router.get('/analytics', settingsController.getAdminAnalytics);

export default router;
