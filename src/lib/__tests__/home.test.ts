import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { CLASS_PAGES } from '@/lib/curriculum/presets';
import { landingPage } from '@/lib/seo/landing';
import { CLASS_TOPICS } from '@/components/home/class-picker';
import { HERO_CODE } from '@/components/home/hero-sheets';
import { NAV_ITEMS, navHrefs } from '@/components/layout/nav-items';

describe('home page', () => {
  it('every class card shows four topics that have a page', () => {
    expect(Object.keys(CLASS_TOPICS).sort()).toEqual(CLASS_PAGES.map((c) => c.slug).sort());
    for (const [clasa, topics] of Object.entries(CLASS_TOPICS)) {
      expect(topics, clasa).toHaveLength(4);
      for (const t of topics) expect(landingPage(clasa, t), `${clasa}/${t}`).toBeDefined();
    }
  });

  it('the sheets in the hero exist, and the code under them is the one the front sheet prints', () => {
    const src = readFileSync('src/components/home/hero-sheets.tsx', 'utf8');
    const paths = [...src.matchAll(/'\/fise-de-lucru\/([^/]+)\/([^/]+)\/fisa\.svg'/g)];
    expect(paths).toHaveLength(3);
    for (const [, clasa, subiect] of paths) expect(landingPage(clasa, subiect), `${clasa}/${subiect}`).toBeDefined();
    expect(landingPage('clasa-pregatitoare', 'despartirea-in-silabe')?.sheetLabel).toBe(HERO_CODE);
  });
});

describe('main menu', () => {
  it('has at most five top items, and every link opens a page that exists', () => {
    expect(NAV_ITEMS.length).toBeLessThanOrEqual(5);
    for (const href of navHrefs()) {
      const path = href.split('#')[0].replace(/\/$/, '');
      expect(existsSync(`src/app${path}/page.tsx`), href).toBe(true);
    }
  });

  it('„Temă pentru părinți” points to a section the home page has', () => {
    expect(navHrefs()).toContain('/#tema');
    expect(readFileSync('src/app/page.tsx', 'utf8')).toContain('id="tema"');
  });

  it('keeps the owner’s KDP tool out of the menu (it is in the footer)', () => {
    expect(navHrefs()).not.toContain('/book');
    expect(readFileSync('src/components/layout/footer.tsx', 'utf8')).toContain('href="/book"');
  });
});
