import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadAvatar } from '../middlewares/upload.middleware.js';
import {
  updateMeSchema,
  adminUpdateUserSchema,
  listUsersSchema,
} from '../validators/user.validator.js';

const router = express.Router();

router.use(protect);

// Current user profile
router.get('/me', userController.getMe);
router.patch('/me', validate(updateMeSchema), userController.updateMe);
router.put('/me/avatar', uploadAvatar, userController.updateAvatar);
router.delete('/me/avatar', userController.deleteAvatar);

// Admin user management
router.use(restrictTo('admin'));
router.get('/', validate(listUsersSchema), userController.adminListUsers);
router.get('/:id', userController.adminGetUserById);
router.patch('/:id', validate(adminUpdateUserSchema), userController.adminUpdateUser);
router.patch('/:id/toggle-active', userController.adminToggleActive);
router.delete('/:id', userController.adminDeleteUser);

export default router;
