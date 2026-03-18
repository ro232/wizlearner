export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requirement: string;
  category: 'letters' | 'numbers' | 'shapes' | 'streaks' | 'community' | 'special';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-worksheet', name: 'First Worksheet', description: 'Created your first worksheet', emoji: '📝', requirement: 'Create 1 worksheet', category: 'special' },
  { id: 'alphabet-explorer', name: 'Alphabet Explorer', description: 'Practiced letters A through M', emoji: '🔤', requirement: 'Practice A-M', category: 'letters' },
  { id: 'alphabet-master', name: 'Alphabet Master', description: 'Practiced all 26 letters', emoji: '🏆', requirement: 'Practice A-Z', category: 'letters' },
  { id: 'number-ninja', name: 'Number Ninja', description: 'Practiced numbers 1 through 20', emoji: '🔢', requirement: 'Practice 1-20', category: 'numbers' },
  { id: 'shape-shifter', name: 'Shape Shifter', description: 'Practiced all basic shapes', emoji: '🔶', requirement: 'All shapes', category: 'shapes' },
  { id: 'streak-3', name: '3-Day Streak', description: '3 days of practice in a row', emoji: '🔥', requirement: '3 consecutive days', category: 'streaks' },
  { id: 'streak-7', name: '7-Day Streak', description: '7 days of practice in a row', emoji: '⚡', requirement: '7 consecutive days', category: 'streaks' },
  { id: 'streak-30', name: '30-Day Streak', description: '30 days of practice in a row', emoji: '💎', requirement: '30 consecutive days', category: 'streaks' },
  { id: 'community-contributor', name: 'Community Star', description: 'Shared a template with the community', emoji: '⭐', requirement: 'Share 1 template', category: 'community' },
  { id: 'curriculum-complete', name: 'Curriculum Complete', description: 'Finished a full curriculum', emoji: '🎓', requirement: 'Complete curriculum', category: 'special' },
  { id: 'name-writer', name: 'Name Writer', description: 'Created a name tracing worksheet', emoji: '✍️', requirement: 'Use custom name', category: 'special' },
  { id: 'multilingual', name: 'Multilingual', description: 'Used worksheets in 2 languages', emoji: '🌍', requirement: 'Use EN + RO', category: 'special' },
];

export function getDailyChallenge(): { letter: string; emoji: string; message: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const emojiMap: Record<string, string> = {
    A: '🍎', B: '⚽', C: '🐱', D: '🐶', E: '🥚', F: '🐟', G: '🍇', H: '🏠',
    I: '🍦', J: '🧃', K: '🪁', L: '🍋', M: '🌙', N: '🥜', O: '🍊', P: '🖊️',
    Q: '👸', R: '🌈', S: '⭐', T: '🌳', U: '☂️', V: '🎻', W: '🐋', X: '✖️',
    Y: '🧶', Z: '⚡',
  };
  const letter = letters[dayOfYear % 26];
  return {
    letter,
    emoji: emojiMap[letter] || '✨',
    message: `Today's letter is ${letter}! Practice tracing it.`,
  };
}

export interface StickerChartSlot {
  letter: string;
  completed: boolean;
  completedAt?: Date;
}

export function createStickerChart(type: 'alphabet' | 'numbers'): StickerChartSlot[] {
  if (type === 'alphabet') {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => ({ letter: l, completed: false }));
  }
  return Array.from({ length: 20 }, (_, i) => ({ letter: String(i + 1), completed: false }));
}
