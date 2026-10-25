import { DateTime, IANAZone } from 'luxon';
import { DEFAULT_TIMEZONE } from './constants.js';

const WEEK_MINUTES = 7 * 24 * 60;
// Reference Sunday used to project weekly slots onto a UTC minute-of-week axis
const REF_SUNDAY = { year: 2024, month: 1, day: 7 };

export const isValidTimezone = (tz) => typeof tz === 'string' && IANAZone.isValidZone(tz);

export const resolveTimezone = (tz, fallback = DEFAULT_TIMEZONE) =>
  isValidTimezone(tz) ? tz : fallback;

/**
 * Parses an ISO date-time string to a UTC JS Date. If the string has no offset it is
 * interpreted in the given timezone.
 */
export function toUtcDate(value, tz = DEFAULT_TIMEZONE) {
  if (value instanceof Date) return value;
  const dt = DateTime.fromISO(String(value), { zone: resolveTimezone(tz) });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

/** Combines a calendar date (YYYY-MM-DD) and a time (HH:mm) in a timezone into a UTC Date. */
export function combineDateAndTime(date, time, tz = DEFAULT_TIMEZONE) {
  const [hour, minute] = time.split(':').map(Number);
  const base = DateTime.fromISO(String(date), { zone: resolveTimezone(tz) });
  return base.set({ hour, minute, second: 0, millisecond: 0 }).toUTC().toJSDate();
}

export function formatInTimezone(date, tz = DEFAULT_TIMEZONE) {
  if (!date) return null;
  return DateTime.fromJSDate(new Date(date)).setZone(resolveTimezone(tz)).toISO();
}

/**
 * Returns a plain copy of `doc` with `<field>Local` keys holding the date in the user's timezone.
 */
export function localizeDates(doc, fields, tz) {
  if (!doc) return doc;
  const plain = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
  const zone = resolveTimezone(tz);
  for (const field of fields) {
    const parts = field.split('.');
    let target = plain;
    for (let i = 0; i < parts.length - 1; i += 1) {
      target = target?.[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (target && target[last]) target[`${last}Local`] = formatInTimezone(target[last], zone);
  }
  plain.timezone = zone;
  return plain;
}

export const timeToMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);

/**
 * Projects a weekly schedule slot onto UTC minutes-of-week ranges (split when wrapping the week).
 */
export function slotToUtcWeekRanges({ dayOfWeek, startTime, endTime, timezone }) {
  const zone = resolveTimezone(timezone);
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = DateTime.fromObject({ ...REF_SUNDAY, hour: sh, minute: sm }, { zone }).plus({
    days: dayOfWeek,
  });
  let end = DateTime.fromObject({ ...REF_SUNDAY, hour: eh, minute: em }, { zone }).plus({
    days: dayOfWeek,
  });
  if (end <= start) end = end.plus({ days: 1 });

  const refUtc = DateTime.fromObject(REF_SUNDAY, { zone: 'utc' });
  const duration = end.diff(start, 'minutes').minutes;
  let s = start.toUTC().diff(refUtc, 'minutes').minutes;
  s = ((s % WEEK_MINUTES) + WEEK_MINUTES) % WEEK_MINUTES;
  const e = s + duration;
  return e > WEEK_MINUTES
    ? [
        [s, WEEK_MINUTES],
        [0, e - WEEK_MINUTES],
      ]
    : [[s, e]];
}

export function slotsOverlap(a, b) {
  const ra = slotToUtcWeekRanges(a);
  const rb = slotToUtcWeekRanges(b);
  return ra.some(([as, ae]) => rb.some(([bs, be]) => as < be && bs < ae));
}

export function schedulesOverlap(listA = [], listB = []) {
  return listA.some((a) => listB.some((b) => slotsOverlap(a, b)));
}

/** Returns true when slots inside one schedule overlap each other. */
export function scheduleHasInternalOverlap(list = []) {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (slotsOverlap(list[i], list[j])) return true;
    }
  }
  return false;
}

export function monthRange(year, month, tz = 'utc') {
  const start = DateTime.fromObject({ year, month, day: 1 }, { zone: resolveTimezone(tz, 'utc') });
  return { start: start.toUTC().toJSDate(), end: start.plus({ months: 1 }).toUTC().toJSDate() };
}

/** 'YYYY-MM' -> UTC range */
export function periodRange(period) {
  const [year, month] = period.split('-').map(Number);
  return monthRange(year, month, 'utc');
}

export function previousPeriod(date = new Date()) {
  return DateTime.fromJSDate(date, { zone: 'utc' }).minus({ months: 1 }).toFormat('yyyy-MM');
}

export function ageFromDob(dob, now = new Date()) {
  if (!dob) return null;
  const birth = new Date(dob);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export const addMinutes = (date, minutes) => new Date(new Date(date).getTime() + minutes * 60000);
export const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);
export const addMonths = (date, months) =>
  DateTime.fromJSDate(new Date(date)).plus({ months }).toJSDate();

export { DateTime };
