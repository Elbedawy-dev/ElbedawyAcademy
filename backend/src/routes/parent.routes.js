import express from 'express';
import * as parentController from '../controllers/parent.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createChildAccountSchema,
  linkChildByCodeSchema,
} from '../validators/academic.validator.js';

const router = express.Router();

router.use(protect);

// Student creates link code to share with parent
router.post('/student/generate-code', restrictTo('student'), parentController.generateStudentLinkCode);

// Parent routes
router.use(restrictTo('parent', 'admin'));
router.get('/children', parentController.getChildren);
router.post('/children', validate(createChildAccountSchema), parentController.createChildAccount);
router.post('/link-by-code', validate(linkChildByCodeSchema), parentController.linkChildByCode);
router.get('/children/:studentId/summary', parentController.getChildSummary);

export default router;
