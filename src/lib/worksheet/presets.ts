import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';

/**
 * Ready-made sheets for the homepage gallery and the guided start. All of them use only
 * free content, so anyone can download them without an account.
 */
export interface Preset {
  id: string;
  title: string;
  text: string;
  config: WorksheetConfig;
}

const base: WorksheetConfig = { ...DEFAULT_CONFIG, alphabet: 'ro', fillPage: true };

export const PRESETS: Preset[] = [
  {
    id: 'litera-a',
    title: 'Litera săptămânii',
    text: 'A mare și mic, cu Ă și Â.',
    config: { ...base, letterMode: 'paired', selectedItems: ['Aa', 'Ăă', 'Ââ'] },
  },
  {
    id: 'numele-meu',
    title: 'Numele meu',
    text: 'Numele copilului, pe toată pagina.',
    config: { ...base, letterMode: 'paired', childName: 'Ana', customWords: ['Ana'], customTitle: 'Numele meu', showLetterIcons: false },
  },
  {
    id: 'cifre',
    title: 'Cifrele 1–5',
    text: 'Cu ordinea liniilor și săgeți.',
    config: { ...base, category: 'numbers', selectedItems: ['1', '2', '3', '4', '5'] },
  },
  {
    id: 'grafice',
    title: 'Exerciții grafice',
    text: 'Linii și zigzag, înainte de litere.',
    config: { ...base, category: 'prewrite', selectedItems: ['vertical', 'horizontal', 'zigzag'] },
  },
  {
    id: 'gaseste-litera',
    title: 'Găsește litera',
    text: 'Colorează toate literele A dintr-o grilă.',
    config: { ...base, category: 'games', selectedItems: ['find:A'] },
  },
  {
    id: 'puncte',
    title: 'Unește punctele',
    text: 'De la 1 la 10 și iese o stea.',
    config: { ...base, category: 'games', selectedItems: ['dots:star'] },
  },
];
