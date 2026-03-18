export type Tier = 'free' | 'starter' | 'full';

export type FontStyle = 'dashed' | 'dotted' | 'outline' | 'cursive';
export type LetterSize = 'small' | 'medium' | 'large';
export type PageSize = 'a4' | 'a5' | 'letter' | 'b5';
export type Orientation = 'portrait' | 'landscape';
export type RowSpacing = 'tight' | 'normal' | 'wide';
export type GuideColor = 'gray' | 'green' | 'orange' | 'purple';
export type BackgroundPattern = 'blank' | 'grid' | 'guides' | 'patratele' | 'dictando' | 'lines';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type LetterMode = 'uppercase' | 'lowercase' | 'paired';
export type ContentCategory = 'letters' | 'numbers' | 'shapes' | 'prewrite' | 'math' | 'games' | 'wordsearch' | 'templates';

export interface WorksheetConfig {
  // Content
  category: ContentCategory;
  letterMode: LetterMode;
  selectedItems: string[];
  customWords: string[];

  // Page settings
  difficulty: Difficulty;
  fontStyle: FontStyle;
  letterSize: LetterSize;
  pageSize: PageSize;
  orientation: Orientation;
  tracingVisibility: number; // 1-10
  rowSpacing: RowSpacing;
  guideColor: GuideColor;
  backgroundPattern: BackgroundPattern;
  rowsPerPage: number;

  // Features
  showGuideLines: boolean;
  showDirectionalArrows: boolean;
  showLetterIcons: boolean;
  showRewardSection: boolean;
  fullPageMode: boolean;
  leftHandedMode: boolean;

  // Header
  childName: string;
  dateField: boolean;
  customTitle: string;
  schoolName: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  tier: Tier;
  accessCode?: string;
  children: ChildProfile[];
  preferences: {
    language: 'en' | 'ro';
    defaultDifficulty: Difficulty;
  };
}

export interface SavedWorksheet {
  id: string;
  userId: string;
  name: string;
  configuration: WorksheetConfig;
  thumbnailUrl?: string;
  isPublic: boolean;
  downloadsCount: number;
  ratingAvg: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CONFIG: WorksheetConfig = {
  category: 'letters',
  letterMode: 'uppercase',
  selectedItems: [],
  customWords: [],
  difficulty: 'beginner',
  fontStyle: 'dashed',
  letterSize: 'medium',
  pageSize: 'a4',
  orientation: 'portrait',
  tracingVisibility: 7,
  rowSpacing: 'normal',
  guideColor: 'gray',
  backgroundPattern: 'guides',
  rowsPerPage: 6,
  showGuideLines: true,
  showDirectionalArrows: true,
  showLetterIcons: true,
  showRewardSection: true,
  fullPageMode: false,
  leftHandedMode: false,
  childName: '',
  dateField: true,
  customTitle: '',
  schoolName: '',
};