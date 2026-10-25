import express from 'express';
import * as roomController from '../controllers/room.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { uploadCoverImage } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(protect);
router.use(requireApprovedTeacher);

router.get('/me', roomController.getMyRoom);
router.patch('/me', uploadCoverImage, roomController.updateMyRoom);
router.get('/me/stats', roomController.getRoomStats);

export default router;
