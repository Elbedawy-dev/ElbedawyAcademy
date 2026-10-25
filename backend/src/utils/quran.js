/**
 * Quran reference data (Madani mushaf, 604 pages, 30 juz).
 * Each surah: [arabicName, englishName, ayahCount, startPage]
 */
const SURAH_DATA = [
  ['الفاتحة', 'Al-Fatihah', 7, 1],
  ['البقرة', 'Al-Baqarah', 286, 2],
  ['آل عمران', 'Aal-Imran', 200, 50],
  ['النساء', 'An-Nisa', 176, 77],
  ['المائدة', "Al-Ma'idah", 120, 106],
  ['الأنعام', "Al-An'am", 165, 128],
  ['الأعراف', "Al-A'raf", 206, 151],
  ['الأنفال', 'Al-Anfal', 75, 177],
  ['التوبة', 'At-Tawbah', 129, 187],
  ['يونس', 'Yunus', 109, 208],
  ['هود', 'Hud', 123, 221],
  ['يوسف', 'Yusuf', 111, 235],
  ['الرعد', "Ar-Ra'd", 43, 249],
  ['إبراهيم', 'Ibrahim', 52, 255],
  ['الحجر', 'Al-Hijr', 99, 262],
  ['النحل', 'An-Nahl', 128, 267],
  ['الإسراء', 'Al-Isra', 111, 282],
  ['الكهف', 'Al-Kahf', 110, 293],
  ['مريم', 'Maryam', 98, 305],
  ['طه', 'Taha', 135, 312],
  ['الأنبياء', 'Al-Anbiya', 112, 322],
  ['الحج', 'Al-Hajj', 78, 332],
  ['المؤمنون', "Al-Mu'minun", 118, 342],
  ['النور', 'An-Nur', 64, 350],
  ['الفرقان', 'Al-Furqan', 77, 359],
  ['الشعراء', "Ash-Shu'ara", 227, 367],
  ['النمل', 'An-Naml', 93, 377],
  ['القصص', 'Al-Qasas', 88, 385],
  ['العنكبوت', 'Al-Ankabut', 69, 396],
  ['الروم', 'Ar-Rum', 60, 404],
  ['لقمان', 'Luqman', 34, 411],
  ['السجدة', 'As-Sajdah', 30, 415],
  ['الأحزاب', 'Al-Ahzab', 73, 418],
  ['سبأ', 'Saba', 54, 428],
  ['فاطر', 'Fatir', 45, 434],
  ['يس', 'Ya-Sin', 83, 440],
  ['الصافات', 'As-Saffat', 182, 446],
  ['ص', 'Sad', 88, 453],
  ['الزمر', 'Az-Zumar', 75, 458],
  ['غافر', 'Ghafir', 85, 467],
  ['فصلت', 'Fussilat', 54, 477],
  ['الشورى', 'Ash-Shura', 53, 483],
  ['الزخرف', 'Az-Zukhruf', 89, 489],
  ['الدخان', 'Ad-Dukhan', 59, 496],
  ['الجاثية', 'Al-Jathiyah', 37, 499],
  ['الأحقاف', 'Al-Ahqaf', 35, 502],
  ['محمد', 'Muhammad', 38, 507],
  ['الفتح', 'Al-Fath', 29, 511],
  ['الحجرات', 'Al-Hujurat', 18, 515],
  ['ق', 'Qaf', 45, 518],
  ['الذاريات', 'Adh-Dhariyat', 60, 520],
  ['الطور', 'At-Tur', 49, 523],
  ['النجم', 'An-Najm', 62, 526],
  ['القمر', 'Al-Qamar', 55, 528],
  ['الرحمن', 'Ar-Rahman', 78, 531],
  ['الواقعة', "Al-Waqi'ah", 96, 534],
  ['الحديد', 'Al-Hadid', 29, 537],
  ['المجادلة', 'Al-Mujadilah', 22, 542],
  ['الحشر', 'Al-Hashr', 24, 545],
  ['الممتحنة', 'Al-Mumtahanah', 13, 549],
  ['الصف', 'As-Saff', 14, 551],
  ['الجمعة', "Al-Jumu'ah", 11, 553],
  ['المنافقون', 'Al-Munafiqun', 11, 554],
  ['التغابن', 'At-Taghabun', 18, 556],
  ['الطلاق', 'At-Talaq', 12, 558],
  ['التحريم', 'At-Tahrim', 12, 560],
  ['الملك', 'Al-Mulk', 30, 562],
  ['القلم', 'Al-Qalam', 52, 564],
  ['الحاقة', 'Al-Haqqah', 52, 566],
  ['المعارج', "Al-Ma'arij", 44, 568],
  ['نوح', 'Nuh', 28, 570],
  ['الجن', 'Al-Jinn', 28, 572],
  ['المزمل', 'Al-Muzzammil', 20, 574],
  ['المدثر', 'Al-Muddaththir', 56, 575],
  ['القيامة', 'Al-Qiyamah', 40, 577],
  ['الإنسان', 'Al-Insan', 31, 578],
  ['المرسلات', 'Al-Mursalat', 50, 580],
  ['النبأ', 'An-Naba', 40, 582],
  ['النازعات', "An-Nazi'at", 46, 583],
  ['عبس', 'Abasa', 42, 585],
  ['التكوير', 'At-Takwir', 29, 586],
  ['الانفطار', 'Al-Infitar', 19, 587],
  ['المطففين', 'Al-Mutaffifin', 36, 587],
  ['الانشقاق', 'Al-Inshiqaq', 25, 589],
  ['البروج', 'Al-Buruj', 22, 590],
  ['الطارق', 'At-Tariq', 17, 591],
  ['الأعلى', "Al-A'la", 19, 591],
  ['الغاشية', 'Al-Ghashiyah', 26, 592],
  ['الفجر', 'Al-Fajr', 30, 593],
  ['البلد', 'Al-Balad', 20, 594],
  ['الشمس', 'Ash-Shams', 15, 595],
  ['الليل', 'Al-Layl', 21, 595],
  ['الضحى', 'Ad-Duha', 11, 596],
  ['الشرح', 'Ash-Sharh', 8, 596],
  ['التين', 'At-Tin', 8, 597],
  ['العلق', 'Al-Alaq', 19, 597],
  ['القدر', 'Al-Qadr', 5, 598],
  ['البينة', 'Al-Bayyinah', 8, 598],
  ['الزلزلة', 'Az-Zalzalah', 8, 599],
  ['العاديات', 'Al-Adiyat', 11, 599],
  ['القارعة', "Al-Qari'ah", 11, 600],
  ['التكاثر', 'At-Takathur', 8, 600],
  ['العصر', 'Al-Asr', 3, 601],
  ['الهمزة', 'Al-Humazah', 9, 601],
  ['الفيل', 'Al-Fil', 5, 601],
  ['قريش', 'Quraysh', 4, 602],
  ['الماعون', "Al-Ma'un", 7, 602],
  ['الكوثر', 'Al-Kawthar', 3, 602],
  ['الكافرون', 'Al-Kafirun', 6, 603],
  ['النصر', 'An-Nasr', 3, 603],
  ['المسد', 'Al-Masad', 5, 603],
  ['الإخلاص', 'Al-Ikhlas', 4, 604],
  ['الفلق', 'Al-Falaq', 5, 604],
  ['الناس', 'An-Nas', 6, 604],
];

export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;
export const TOTAL_SURAHS = 114;

export const SURAHS = SURAH_DATA.map(([nameAr, nameEn, ayahs, startPage], i) => ({
  number: i + 1,
  nameAr,
  nameEn,
  ayahs,
  startPage,
}));

export const getSurah = (number) => SURAHS[Number(number) - 1] || null;

/** Juz boundaries in the Madani mushaf: juz 1 = pages 1-21, juz n starts at 2 + 20(n-1). */
export function juzPageRange(juz) {
  if (juz === 1) return { from: 1, to: 21 };
  const from = 2 + 20 * (juz - 1);
  const to = juz === TOTAL_JUZ ? TOTAL_PAGES : from + 19;
  return { from, to };
}

export function juzOfPage(page) {
  const p = Number(page);
  if (p < 22) return 1;
  return Math.min(TOTAL_JUZ, Math.floor((p - 2) / 20) + 1);
}

export const pagesInJuz = (juz) => {
  const { from, to } = juzPageRange(juz);
  return to - from + 1;
};

/**
 * Approximates the mushaf page of an ayah by interpolating inside the surah's page span.
 * Used only when the teacher does not provide explicit page numbers.
 */
export function estimatePage(surahNumber, ayah) {
  const surah = getSurah(surahNumber);
  if (!surah) return null;
  const next = getSurah(surahNumber + 1);
  const end = next ? Math.max(surah.startPage, next.startPage) : TOTAL_PAGES;
  if (end === surah.startPage || surah.ayahs <= 1) return surah.startPage;
  const ratio = (Math.min(Math.max(ayah, 1), surah.ayahs) - 1) / (surah.ayahs - 1);
  return Math.min(TOTAL_PAGES, surah.startPage + Math.round(ratio * (end - surah.startPage)));
}

export function isValidAyahRange(surahNumber, fromAyah, toAyah) {
  const surah = getSurah(surahNumber);
  if (!surah) return false;
  return fromAyah >= 1 && toAyah >= fromAyah && toAyah <= surah.ayahs;
}

/** Expands an inclusive page range into an array of page numbers. */
export function expandPages(from, to) {
  const out = [];
  if (!from || !to) return out;
  for (let p = Math.max(1, from); p <= Math.min(TOTAL_PAGES, to); p += 1) out.push(p);
  return out;
}
