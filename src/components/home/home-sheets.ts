/**
 * The real sheets shown on the home page: the static SVGs of the „Fișe de lucru” pages
 * (/fise-de-lucru/[clasa]/[subiect]/fisa.svg, drawn at build time by the same engine as the PDF).
 * No sheet engine is loaded on the home page. A test checks that each of these pages exists.
 */
export interface HomeSheet {
  clasa: string;
  subiect: string;
  title: string;
  level: string;
  alt: string;
}

export const sheetSvg = (s: Pick<HomeSheet, 'clasa' | 'subiect'>) => `/fise-de-lucru/${s.clasa}/${s.subiect}/fisa.svg`;
export const sheetPage = (s: Pick<HomeSheet, 'clasa' | 'subiect'>) => `/fise-de-lucru/${s.clasa}/${s.subiect}`;

/** The large sheet next to the title. */
export const HERO_SHEET: HomeSheet = {
  clasa: 'clasa-pregatitoare',
  subiect: 'litere-de-tipar',
  title: 'Litere de tipar',
  level: 'Clasa pregătitoare',
  alt: 'Fișă de clasa pregătitoare: literele A, B, C de tipar, de urmărit și de scris pe liniatură',
};

/** „Fișe folosite des”: four sheets, from grădiniță to clasa I. */
export const POPULAR_SHEETS: HomeSheet[] = [
  { clasa: 'gradinita', subiect: 'cifre', title: 'Cifre de trasat', level: 'Grădiniță', alt: 'Fișă de grădiniță: cifrele 1, 2, 3 de urmărit' },
  { clasa: 'gradinita', subiect: 'grafisme', title: 'Exerciții grafice', level: 'Grădiniță', alt: 'Fișă de grădiniță: bastonașe, zigzaguri și bucle de urmărit' },
  { clasa: 'clasa-1', subiect: 'litere-de-mana', title: 'Litere de mână', level: 'Clasa I', alt: 'Fișă de clasa I: literele de mână de urmărit și de scris' },
  { clasa: 'clasa-1', subiect: 'adunari', title: 'Adunări până la 100', level: 'Clasa I', alt: 'Fișă de clasa I: adunări până la 100, cu rezultatul în căsuță' },
];
