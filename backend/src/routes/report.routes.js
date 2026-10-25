import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createReportSchema,
  resolveReportSchema,
} from '../validators/academic.validator.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createReportSchema), reportController.createReport);

// Admin moderation queue
router.use(restrictTo('admin'));
router.get('/', reportController.listReports);
router.patch('/:id/resolve', validate(resolveReportSchema), reportController.resolveReport);

export default router;
