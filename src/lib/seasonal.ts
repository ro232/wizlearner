export type Season = 'default' | 'christmas' | 'valentine' | 'easter' | 'halloween' | 'summer' | 'backtoschool';

export interface SeasonalTheme {
  id: Season;
  name: string;
  dateRange: { start: string; end: string }; // MM-DD format
  colors: { primary: string; secondary: string; accent: string; border: string };
  emoji: string[];
  borderStyle: string;
  rewardText: string;
  certificateTitle: string;
}

const themes: Record<Season, SeasonalTheme> = {
  default: {
    id: 'default', name: 'Classic',
    dateRange: { start: '01-01', end: '12-31' },
    colors: { primary: '#2E5C8A', secondary: '#EFF6FF', accent: '#E8913A', border: '#CBD5E1' },
    emoji: ['⭐', '🌟', '✨', '🎯', '👍'],
    borderStyle: 'none',
    rewardText: 'Great job! You earned a sticker!',
    certificateTitle: 'Certificate of Achievement',
  },
  christmas: {
    id: 'christmas', name: 'Christmas',
    dateRange: { start: '11-15', end: '12-31' },
    colors: { primary: '#B91C1C', secondary: '#FEF2F2', accent: '#15803D', border: '#DC2626' },
    emoji: ['🎄', '🎅', '⛄', '🎁', '❄️'],
    borderStyle: 'snowflakes',
    rewardText: 'Ho ho ho! Santa is proud of you!',
    certificateTitle: 'Christmas Star Award',
  },
  valentine: {
    id: 'valentine', name: "Valentine's Day",
    dateRange: { start: '01-15', end: '02-14' },
    colors: { primary: '#DB2777', secondary: '#FDF2F8', accent: '#EC4899', border: '#F472B6' },
    emoji: ['💕', '❤️', '💖', '🌹', '💝'],
    borderStyle: 'hearts',
    rewardText: 'You are loved! Amazing work!',
    certificateTitle: 'Valentine Star Award',
  },
  easter: {
    id: 'easter', name: 'Easter',
    dateRange: { start: '03-01', end: '04-30' },
    colors: { primary: '#7C3AED', secondary: '#EDE9FE', accent: '#F59E0B', border: '#A78BFA' },
    emoji: ['🐰', '🥚', '🌷', '🐣', '🌸'],
    borderStyle: 'eggs',
    rewardText: 'Egg-cellent work! Keep hopping!',
    certificateTitle: 'Easter Bunny Award',
  },
  halloween: {
    id: 'halloween', name: 'Halloween',
    dateRange: { start: '10-01', end: '10-31' },
    colors: { primary: '#EA580C', secondary: '#FFF7ED', accent: '#7C3AED', border: '#F97316' },
    emoji: ['🎃', '👻', '🦇', '🕷️', '🍬'],
    borderStyle: 'pumpkins',
    rewardText: 'Spook-tacular work!',
    certificateTitle: 'Halloween Hero Award',
  },
  summer: {
    id: 'summer', name: 'Summer Fun',
    dateRange: { start: '06-01', end: '07-31' },
    colors: { primary: '#0891B2', secondary: '#ECFEFF', accent: '#F59E0B', border: '#22D3EE' },
    emoji: ['☀️', '🏖️', '🌊', '🍦', '🐚'],
    borderStyle: 'waves',
    rewardText: 'Sun-sational work!',
    certificateTitle: 'Summer Star Award',
  },
  backtoschool: {
    id: 'backtoschool', name: 'Back to School',
    dateRange: { start: '08-01', end: '09-30' },
    colors: { primary: '#1D4ED8', secondary: '#EFF6FF', accent: '#DC2626', border: '#3B82F6' },
    emoji: ['📚', '✏️', '🎒', '📐', '🍎'],
    borderStyle: 'supplies',
    rewardText: 'Ready for school! Amazing job!',
    certificateTitle: 'School Star Award',
  },
};

export function getCurrentSeason(): Season {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const mmdd = `${month}-${day}`;

  for (const [key, theme] of Object.entries(themes)) {
    if (key === 'default') continue;
    if (mmdd >= theme.dateRange.start && mmdd <= theme.dateRange.end) {
      return key as Season;
    }
  }
  return 'default';
}

export function getTheme(season: Season): SeasonalTheme {
  return themes[season];
}

export function getAllThemes(): SeasonalTheme[] {
  return Object.values(themes);
}

export { themes };
