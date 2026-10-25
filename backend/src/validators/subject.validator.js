import { z } from 'zod';
import { SUBJECT_TYPES } from '../utils/constants.js';

export const listSubjectsSchema = z.object({
  query: z
    .object({
      type: z.enum(SUBJECT_TYPES).optional(),
    })
    .optional(),
});

export default { listSubjectsSchema };
