/**
 * Pluggable profanity filter hook. The default implementation masks words from a small
 * Arabic/English list. Replace it at startup with registerProfanityFilter(fn) to plug in
 * an external moderation service. A filter receives text and returns { clean, flagged }.
 */

const DEFAULT_WORDS = [
  // English
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'dick',
  'slut',
  'whore',
  // Arabic (common insults)
  'كلب',
  'حمار',
  'غبي',
  'حيوان',
  'زفت',
  'خول',
  'شرموط',
  'شرموطة',
  'عرص',
  'منيك',
  'كس',
  'طيز',
];

let words = [...DEFAULT_WORDS];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildRegex() {
  // Unicode-aware word boundaries so Arabic words are matched as whole words
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map(escape).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'giu');
}

let regex = buildRegex();

function defaultFilter(text) {
  if (!text) return { clean: text, flagged: false };
  let flagged = false;
  const clean = String(text).replace(regex, (_m, pre, word) => {
    flagged = true;
    return `${pre}${'*'.repeat([...word].length)}`;
  });
  return { clean, flagged };
}

let activeFilter = defaultFilter;

export function registerProfanityFilter(fn) {
  if (typeof fn !== 'function') throw new Error('Profanity filter must be a function');
  activeFilter = fn;
}

export function addProfanityWords(list = []) {
  words = [...new Set([...words, ...list.map((w) => w.toLowerCase())])];
  regex = buildRegex();
}

export async function filterProfanity(text) {
  return activeFilter(text);
}
