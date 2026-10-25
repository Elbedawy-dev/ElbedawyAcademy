import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as subjectService from '../services/subject.service.js';

export const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await subjectService.listActiveSubjects(req.query);
  sendSuccess(res, { data: subjects });
});

export default { getSubjects };
