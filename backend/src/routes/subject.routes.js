import express from 'express';
import * as subjectController from '../controllers/subject.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { listSubjectsSchema } from '../validators/subject.validator.js';

const router = express.Router();

router.get('/', validate(listSubjectsSchema), subjectController.getSubjects);

export default router;
