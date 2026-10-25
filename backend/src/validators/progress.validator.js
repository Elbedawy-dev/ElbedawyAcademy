import { z } from 'zod';
import { isValidAyahRange, getSurah } from '../utils/quran.js';
import {
  QURAN_ENTRY_TYPES,
  QURAN_RATINGS,
  SCHOOL_TERMS,
} from '../utils/constants.js';

export const createQuranProgressSchema = z.object({
  body: z.object({
    student: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
    group: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    session: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    date: z.coerce.date().optional(),
    entryType: z.enum(QURAN_ENTRY_TYPES),
    surah: z.number().int().min(1).max(114),
    fromAyah: z.number().int().min(1),
    toAyah: z.number().int().min(1),
    pageFrom: z.number().int().min(1).max(604).optional(),
    pageTo: z.number().int().min(1).max(604).optional(),
    juz: z.number().int().min(1).max(30),
    rating: z.enum(QURAN_RATINGS).default('good'),
    mistakes: z.object({
      hifz: z.number().int().min(0).optional(),
      tajweed: z.number().int().min(0).optional(),
      notes: z.string().max(500).optional(),
    }).optional(),
    tafsirCovered: z.object({
      covered: z.boolean().default(false),
      notes: z.string().max(1000).optional(),
    }).optional(),
    teacherNote: z.string().max(1000).optional(),
  }).refine((data) => isValidAyahRange(data.surah, data.fromAyah, data.toAyah), {
    message: 'Invalid ayah range: must satisfy 1 <= fromAyah <= toAyah <= surah.ayahs',
    path: ['toAyah'],
  }),
});

export const updateQuranProgressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    entryType: z.enum(QURAN_ENTRY_TYPES).optional(),
    surah: z.number().int().min(1).max(114).optional(),
    fromAyah: z.number().int().min(1).optional(),
    toAyah: z.number().int().min(1).optional(),
    pageFrom: z.number().int().min(1).max(604).optional(),
    pageTo: z.number().int().min(1).max(604).optional(),
    juz: z.number().int().min(1).max(30).optional(),
    rating: z.enum(QURAN_RATINGS).optional(),
    mistakes: z.object({
      hifz: z.number().int().min(0).optional(),
      tajweed: z.number().int().min(0).optional(),
      notes: z.string().max(500).optional(),
    }).optional(),
    tafsirCovered: z.object({
      covered: z.boolean().optional(),
      notes: z.string().max(1000).optional(),
    }).optional(),
    teacherNote: z.string().max(1000).optional(),
  }).refine((data) => {
    if (data.surah !== undefined) {
      const s = getSurah(data.surah);
      if (!s) return false;
      if (data.toAyah !== undefined && data.toAyah > s.ayahs) return false;
      if (data.fromAyah !== undefined && data.fromAyah > s.ayahs) return false;
    }
    if (data.fromAyah !== undefined && data.toAyah !== undefined) {
      if (data.fromAyah > data.toAyah) return false;
    }
    return true;
  }, {
    message: 'Invalid ayah range: fromAyah/toAyah exceed surah ayah count or fromAyah > toAyah',
    path: ['toAyah'],
  }),
});

export const createSchoolProgressSchema = z.object({
  body: z.object({
    student: z.string().regex(/^[0-9a-fA-F]{24}$/),
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    subject: z.string().regex(/^[0-9a-fA-F]{24}$/),
    term: z.enum(SCHOOL_TERMS).default('term_1'),
    topicsCovered: z.array(z.string().trim()).optional(),
    grades: z.array(
      z.object({
        title: z.string().min(1).max(120),
        score: z.number().min(0),
        maxScore: z.number().min(1),
        date: z.coerce.date().optional(),
      }),
    ).optional(),
    teacherNote: z.string().max(1500).optional(),
  }),
});
