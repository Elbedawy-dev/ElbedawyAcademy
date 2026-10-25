import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { uploadChatFiles } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/groups/:groupId/messages', chatController.getGroupMessages);
router.post(
  '/groups/:groupId/messages',
  uploadChatFiles,
  chatController.sendMessage,
);
router.patch('/messages/:id', chatController.editMessage);
router.delete('/messages/:id', chatController.deleteMessage);
router.post('/groups/:groupId/read', chatController.markMessagesAsRead);

// Teacher mutes student
router.post(
  '/groups/:groupId/mute/:studentId',
  requireApprovedTeacher,
  chatController.muteStudent,
);

export default router;
