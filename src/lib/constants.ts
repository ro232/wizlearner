export const THEME = {
  primary: '#2E5C8A',
  accent: '#E8913A',
  success: '#2D8B5C',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  categories: {
    letters: '#2563EB',
    numbers: '#059669',
    shapes: '#7C3AED',
    math: '#EA580C',
    games: '#DC2626',
    templates: '#0D9488',
    prewrite: '#0891B2',
    wordsearch: '#6366F1',
  },
} as const;

export const EMOJI_MAP: Record<string, string> = {
  A: '🍎', B: '⚽', C: '🐱', D: '🐶', E: '🥚', F: '🐟', G: '🍇', H: '🏠',
  I: '🍦', J: '🧃', K: '🪁', L: '🍋', M: '🌙', N: '🥜', O: '🍊', P: '🖊️',
  Q: '👸', R: '🌈', S: '⭐', T: '🌳', U: '☂️', V: '🎻', W: '🐋', X: '✖️',
  Y: '🧶', Z: '⚡',
};

// Letter lists per alphabet live in @/lib/glyphs/data (ALPHABETS); these are the English defaults.
export const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const PAIRED_LETTERS = UPPERCASE_LETTERS.map((l, i) => `${l}${LOWERCASE_LETTERS[i]}`);
export const NUMBERS = Array.from({ length: 21 }, (_, i) => String(i));
export const SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'oval', 'diamond', 'star', 'heart', 'hexagon', 'pentagon'];

export const FREE_LIMITS = {
  letters: ['A', 'B', 'C', 'D', 'E'], // diacritic forms of a free letter (Ă, Â) are free too
  numbers: ['0', '1', '2', '3', '4', '5'],
  shapes: ['circle', 'square', 'triangle'],
  prewrite: ['vertical', 'horizontal', 'zigzag'],
  maxDownloadsPerDay: 2,
  maxCloudSave: 0,
  templates: 2,
} as const;

export const STARTER_LIMITS = {
  letters: UPPERCASE_LETTERS,
  numbers: NUMBERS,
  shapes: SHAPES,
  maxDownloadsPerDay: Infinity,
  maxCloudSave: 20,
  templates: 10,
} as const;

// Only content types that actually produce a worksheet today. Math, games, word search and
// templates exist as type names for later, but are not shown until they are built.
export const CATEGORY_TABS: { id: 'letters' | 'numbers' | 'shapes' | 'prewrite' | 'games'; label: string; icon: string; locked?: boolean }[] = [
  { id: 'letters', label: 'Litere', icon: '✏️' },
  { id: 'numbers', label: 'Cifre', icon: '🔢' },
  { id: 'shapes', label: 'Forme', icon: '◆' },
  { id: 'prewrite', label: 'Exerciții grafice', icon: '〰' },
  { id: 'games', label: 'Jocuri', icon: '🧩' },
];
