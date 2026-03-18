const translations = {
  en: {
    app: { name: 'WorksheetWiz', tagline: 'Create perfect practice sheets in seconds' },
    nav: { generator: 'Generator', dashboard: 'Dashboard', community: 'Community', pricing: 'Pricing', login: 'Log in', startFree: 'Start Free' },
    generator: {
      title: 'Worksheet Generator',
      subtitle: 'Premium Tracing Sheet Generator',
      reset: 'Reset', print: 'Print', downloadPdf: 'Download PDF',
      pickItems: 'Pick Items', selected: 'selected',
      addAllFree: 'Add All Free', removeAll: 'Remove All',
      customWordPlaceholder: '+ Custom Word / Name',
      difficulty: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
      fontStyle: 'Font Style', letterSize: 'Letter Size', tracingVisibility: 'Tracing Visibility',
      hard: 'Hard', easy: 'Easy',
      background: 'Background Pattern', guideColor: 'Guide Line Color',
      letterIcons: 'Letter Icons (emoji)', directionalArrows: 'Directional Arrows',
      guideLines: 'Guide Lines', rewardSection: 'Reward Section',
      childName: "Child's Name", childNamePlaceholder: 'e.g. Maria',
      sheetContent: 'Sheet Content', emptySheet: 'Your sheet is empty. Pick items above!',
      items: 'items', pages: 'pages', page: 'page',
      livePreview: 'Live Preview', realtime: 'Real-time',
    },
    tiers: { free: 'Free', starter: 'Starter', full: 'Full Access' },
    footer: { madeWith: 'Made with', forLearners: 'for little learners' },
  },
  ro: {
    app: { name: 'WorksheetWiz', tagline: 'Creează fișe de lucru perfecte în câteva secunde' },
    nav: { generator: 'Generator', dashboard: 'Panou', community: 'Comunitate', pricing: 'Prețuri', login: 'Autentificare', startFree: 'Începe Gratuit' },
    generator: {
      title: 'Generator de Fișe',
      subtitle: 'Generator Premium de Fișe de Lucru',
      reset: 'Resetare', print: 'Printare', downloadPdf: 'Descarcă PDF',
      pickItems: 'Alege Elemente', selected: 'selectate',
      addAllFree: 'Adaugă Toate Gratuite', removeAll: 'Elimină Toate',
      customWordPlaceholder: '+ Cuvânt / Nume personalizat',
      difficulty: { beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' },
      fontStyle: 'Stil Font', letterSize: 'Dimensiune Litere', tracingVisibility: 'Vizibilitate Trasare',
      hard: 'Greu', easy: 'Ușor',
      background: 'Model Fundal', guideColor: 'Culoare Linii Ghid',
      letterIcons: 'Pictograme litere (emoji)', directionalArrows: 'Săgeți direcționale',
      guideLines: 'Linii ghid', rewardSection: 'Secțiune recompensă',
      childName: 'Numele Copilului', childNamePlaceholder: 'ex. Maria',
      sheetContent: 'Conținut Fișă', emptySheet: 'Fișa e goală. Alege elemente de mai sus!',
      items: 'elemente', pages: 'pagini', page: 'pagină',
      livePreview: 'Previzualizare Live', realtime: 'Timp real',
    },
    tiers: { free: 'Gratuit', starter: 'Starter', full: 'Acces Complet' },
    footer: { madeWith: 'Făcut cu', forLearners: 'pentru micii învățăcei' },
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof translations.en;

export function t(lang: Language, path: string): string {
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = translations[lang];
  for (const key of keys) {
    if (current[key] === undefined) return path;
    current = current[key];
  }
  return current as string;
}

export default translations;