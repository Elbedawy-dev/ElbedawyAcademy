import express from 'express';
import * as groupController from '../controllers/group.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createGroupSchema,
  updateGroupSchema,
  moveMemberSchema,
  removeMemberSchema,
} from '../validators/group.validator.js';

const router = express.Router();

router.use(protect);

// Role-aware list of groups
router.get('/', groupController.listMyGroups);
router.get('/:id', groupController.getGroupById);
router.get('/:id/members', groupController.listGroupMembers);

// Teacher-managed group operations
router.post(
  '/',
  requireApprovedTeacher,
  validate(createGroupSchema),
  groupController.createGroup,
);
router.patch(
  '/:id',
  requireApprovedTeacher,
  validate(updateGroupSchema),
  groupController.updateGroup,
);
router.post(
  '/:id/regenerate-code',
  requireApprovedTeacher,
  groupController.regenerateJoinCode,
);
router.delete(
  '/:groupId/members/:studentId',
  requireApprovedTeacher,
  validate(removeMemberSchema),
  groupController.removeMember,
);
router.post(
  '/:groupId/move-member',
  requireApprovedTeacher,
  validate(moveMemberSchema),
  groupController.moveMember,
);

export default router;
