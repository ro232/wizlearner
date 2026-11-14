import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { DEFAULT_CONFIG, type ContentCategory, type WorksheetConfig } from '@/types';
import { isItemAllowed } from '@/lib/access';
import { buildWorksheetPages, isWordAllowed, rowItems } from '@/lib/worksheet/layout';
import { normalizeKey } from '@/lib/glyphs/data';

const store = () => useWorksheetStore.getState();
const config = () => store().config;

/** What LockedNotice would report as "not on the sheet" on the free plan. */
function lockedOnFree(c: WorksheetConfig): string[] {
  const name = normalizeKey(c.childName).trim();
  return [...c.selectedItems.filter((i) => !isItemAllowed(i, c.category, 'free')), ...(c.category === 'letters' ? c.customWords.filter((w) => !isWordAllowed(w, 'free') && normalizeKey(w).trim() !== name) : [])];
}

beforeEach(() => store().resetConfig());

describe('changing category', () => {
  const picks: [ContentCategory, string[]][] = [
    ['math', ['add', 'sub', 'cmp']],
    ['numbers', ['1', '2', '3']],
    ['shapes', ['circle', 'star']],
    ['prewrite', ['zigzag']],
    ['games', ['find:A', 'dots:star', 'count:5']],
  ];

  it.each(picks)('„Trasează-l” pressed in %s gives a letter sheet with the name only', (category, items) => {
    store().setCategory(category);
    for (const i of items) store().toggleItem(i);
    expect(config().selectedItems).toEqual(items);
    store().setChildName('Ada');
    store().addCustomWord('Ada');
    expect(config().category).toBe('letters');
    expect(config().selectedItems).toEqual([]);
    expect(config().customWords).toEqual(['Ada']);
    // nothing from the other category is traced as text ("add", "findA", "circle") …
    expect(rowItems(config(), 'full').map((r) => r.item)).toEqual(['ADA']);
    // … and nothing free is reported as locked
    expect(lockedOnFree(config())).toEqual([]);
    expect(buildWorksheetPages(config(), 'free')).toHaveLength(1);
  });

  it('a word that is already on the list still moves the sheet to letters, cleanly', () => {
    store().addCustomWord('BEC');
    store().setCategory('math');
    store().toggleItem('add');
    store().addCustomWord('BEC');
    expect(config().category).toBe('letters');
    expect(config().selectedItems).toEqual([]);
    expect(config().customWords).toEqual(['BEC']);
  });

  it('keeps the chosen letters when a word is added on a letter sheet', () => {
    store().toggleItem('A');
    store().toggleItem('B');
    store().addCustomWord('  bec  ');
    expect(config().selectedItems).toEqual(['A', 'B']);
    expect(config().customWords).toEqual(['bec']);
  });

  it('setCategory starts the new category empty; foreign items cannot be added', () => {
    store().toggleItem('A');
    store().setCategory('numbers');
    expect(config().selectedItems).toEqual([]);
    store().toggleItem('add');
    store().toggleItem('A');
    store().addItems(['1', 'circle', '2', 'find:A']);
    expect(config().selectedItems).toEqual(['1', '2']);
    store().toggleItem('1');
    expect(config().selectedItems).toEqual(['2']);
  });

  it('a sheet handed in from outside is cleaned on the way in', () => {
    useWorksheetStore.setState({ config: { ...DEFAULT_CONFIG, category: 'letters', selectedItems: ['A', 'add', 'circle'], customWords: null as unknown as string[] } });
    expect(config().selectedItems).toEqual(['A']);
    expect(config().customWords).toEqual([]);
    useWorksheetStore.setState({ config: null as unknown as WorksheetConfig });
    expect(config()).toEqual(DEFAULT_CONFIG);
    useWorksheetStore.setState({ tier: 'full' });
    expect(store().tier).toBe('full');
    useWorksheetStore.setState({ tier: 'free' });
  });
});

describe('the traced name follows the name field', () => {
  const type = (text: string) => {
    for (let i = 1; i <= text.length; i++) store().setChildName(text.slice(0, i));
  };

  it('correcting the name replaces the row', () => {
    store().setChildName('Stefanut');
    store().addCustomWord('Stefanut');
    store().setChildName('Ștefănuț');
    expect(config().customWords).toEqual(['Ștefănuț']);
    expect(lockedOnFree(config())).toEqual([]);
    expect(rowItems(config(), 'free')).toHaveLength(1);
  });

  it('works letter by letter, with backspaces, and after the field was emptied', () => {
    store().addCustomWord('BEC');
    type('Stefan');
    store().addCustomWord('Stefan');
    store().addCustomWord('AC');
    expect(config().customWords).toEqual(['BEC', 'Stefan', 'AC']);
    for (const step of ['Stefa', 'Stef', 'Ste', 'St', 'S', '']) store().setChildName(step);
    expect(config().customWords).toEqual(['BEC', 'AC']);
    type('Ștefănuț');
    expect(config().customWords).toEqual(['BEC', 'Ștefănuț', 'AC']);
    expect(lockedOnFree(config())).toEqual([]);
  });

  it('typed with a cedilla or extra spaces it is still the same row', () => {
    store().setChildName('Ştefan  Ionuţ');
    store().addCustomWord(config().childName);
    expect(config().customWords).toEqual(['Ștefan Ionuț']);
    expect(rowItems(config(), 'free')).toHaveLength(1);
    store().setChildName('Ştefan Ionuţ ');
    expect(config().customWords).toEqual(['Ștefan Ionuț']);
    store().setChildName('Ştefan Ion');
    expect(config().customWords).toEqual(['Ștefan Ion']);
  });

  it('a name that is not traced stays only in the header', () => {
    store().addCustomWord('BEC');
    type('Ana');
    store().setChildName('');
    type('Maria');
    expect(config().customWords).toEqual(['BEC']);
  });

  it('removing the row by hand ends the link', () => {
    store().setChildName('Ana');
    store().addCustomWord('Ana');
    store().setChildName('');
    store().addCustomWord('AC');
    store().setChildName('Maria');
    expect(config().customWords).toEqual(['AC']);
  });

  it('never leaves two rows with the same name', () => {
    store().addCustomWord('Ana');
    store().setChildName('An');
    store().addCustomWord('An');
    store().setChildName('Ana');
    expect(config().customWords).toEqual(['Ana']);
  });
});

describe('what the browser remembered', () => {
  const KEY = 'wizlearner-last-sheet';
  let data: Record<string, string>;
  beforeEach(() => {
    data = {};
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), removeItem: (k: string) => void delete data[k] } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const rehydrateWith = async (raw: string) => {
    store().resetConfig();
    data[KEY] = raw;
    await useWorksheetStore.persist.rehydrate();
    return config();
  };

  it.each([
    ['nulls where lists are expected', JSON.stringify({ state: { config: { customWords: null, selectedItems: null, childName: null } }, version: 2 })],
    ['the same, written by the previous version', JSON.stringify({ state: { config: { customWords: null, selectedItems: null, childName: null } }, version: 1 })],
    ['a very old version', JSON.stringify({ state: { config: { selectedItems: 'A' } }, version: 0 })],
    ['a newer version we do not know', JSON.stringify({ state: { config: { category: 'holograms', selectedItems: [{}] } }, version: 9 })],
    ['no state', JSON.stringify({ state: null, version: 2 })],
    ['state without a config', JSON.stringify({ state: {}, version: 2 })],
    ['config that is not an object', JSON.stringify({ state: { config: 'x' }, version: 2 })],
    ['null', 'null'],
    ['a number', '5'],
    ['not JSON at all', '{{{'],
  ])('%s → a sheet that can be drawn', async (_name, raw) => {
    const c = await rehydrateWith(raw);
    expect(Array.isArray(c.selectedItems)).toBe(true);
    expect(Array.isArray(c.customWords)).toBe(true);
    expect(typeof c.childName).toBe('string');
    expect(buildWorksheetPages(c, 'free').length).toBeGreaterThan(0);
  });

  it('keeps a good sheet, also one saved by the previous version', async () => {
    const good = { ...DEFAULT_CONFIG, selectedItems: ['A', 'B'], customWords: ['Ana'], childName: 'Ana', difficulty: 'advanced' as const };
    for (const version of [1, 2]) {
      const c = await rehydrateWith(JSON.stringify({ state: { config: good }, version }));
      expect(c).toEqual(good);
    }
  });

  it('never takes the plan from storage', async () => {
    await rehydrateWith(JSON.stringify({ state: { tier: 'full', config: DEFAULT_CONFIG }, version: 2 }));
    expect(store().tier).toBe('free');
  });
});
