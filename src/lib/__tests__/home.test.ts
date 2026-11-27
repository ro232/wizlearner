import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { CLASS_PAGES } from '@/lib/curriculum/presets';
import { landingPage } from '@/lib/seo/landing';
import { CLASS_TOPICS } from '@/components/home/class-picker';
import { HERO_CODE } from '@/components/home/hero-sheets';
import { ALL_TOOLS, CADRU_NAV, NAV_ITEMS, PARINTE_NAV, navHrefs, navItemsFor } from '@/components/layout/nav-items';
import { CHILD_STAGES } from '@/stores/role-store';
import { HEAVY_ROUTES, STAGE_TOPICS, linkPrefetch } from '@/lib/role-links';
import { LANDING_CLASSES } from '@/lib/seo/landing';
import { ROUTE_META } from '@/lib/seo/metadata';

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

describe('menu by role', () => {
  const labels = (role: 'cadru' | 'parinte' | null) => navItemsFor(role).map((i) => i.label);
  const exists = (href: string) => existsSync(`src/app${href.split('#')[0].replace(/\/$/, '')}/page.tsx`);
  // what a parent must not meet in the menu: the school paperwork (competențe, planificare, programă)
  const SCHOOL_WORDS = /competen|planific|program/i;

  it('with no role it is the menu everyone has always seen', () => {
    expect(navItemsFor(null)).toBe(NAV_ITEMS);
  });

  it('a teacher gets the dashboard, the sheets, the group, the plan and the programme', () => {
    expect(labels('cadru')).toEqual(['Panou', 'Fișe de lucru', 'Grupa mea', 'Planificare', 'Programa', 'Toate uneltele']);
    expect(navHrefs(CADRU_NAV)).toEqual(['/panou/cadru', '/generator', '/grupa', '/planificare', '/programa']);
  });

  it('a parent gets the dashboard, the name sheet, the workbooks, the sheets by age and Advent (seasonal)', () => {
    expect(labels('parinte')).toEqual(['Panou', 'Fișă cu nume', 'Caiete', 'Fișe pe vârste', 'Advent', 'Toate uneltele']);
    expect(navHrefs(PARINTE_NAV)).toEqual(['/panou/parinte', '/nume', '/caiete', '/fise-de-lucru', '/advent']);
    const advent = PARINTE_NAV.find((i) => i.kind === 'link' && i.href === '/advent');
    expect(advent && advent.kind === 'link' && advent.seasonal).toBe('advent');
  });

  it('a parent’s menu never names the school paperwork', () => {
    for (const item of navItemsFor('parinte')) {
      expect(item.label, item.label).not.toMatch(SCHOOL_WORDS);
      if (item.kind === 'link') expect(item.href).not.toMatch(/^\/(programa|planificare)/);
      else for (const l of item.links) {
        expect(`${l.label} ${l.text ?? ''}`, l.href).not.toMatch(SCHOOL_WORDS);
        expect(l.href).not.toMatch(/^\/(programa|planificare)/);
      }
    }
    for (const page of ['src/app/panou/parinte/page.tsx', 'src/app/panou/parinte/layout.tsx']) {
      // (the text shown to the visitor: comments left out)
      const text = readFileSync(page, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(text, page).not.toMatch(SCHOOL_WORDS);
    }
    expect(`${ROUTE_META['/panou/parinte'].title} ${ROUTE_META['/panou/parinte'].description}`).not.toMatch(SCHOOL_WORDS);
  });

  it('every link of the role menus opens a page that exists; „Toate uneltele” keeps every tool reachable', () => {
    for (const role of ['cadru', 'parinte'] as const) for (const href of navHrefs(navItemsFor(role))) expect(exists(href), href).toBe(true);
    // everything the general menu opens (but the section „/#tema” of the home page) is in „Toate uneltele”
    const all = ALL_TOOLS.links.map((l) => l.href);
    for (const href of navHrefs().filter((h) => !h.includes('#'))) expect(all, href).toContain(href);
    expect(new Set(all).size).toBe(all.length);
    // a teacher sees all of it; the KDP tool stays in the footer for everyone
    expect(navItemsFor('cadru').at(-1)).toMatchObject({ kind: 'group', links: ALL_TOOLS.links });
    expect(all).not.toContain('/book');
  });

  it('the dashboards exist, are not indexed and have their own titles', () => {
    for (const path of ['/panou/cadru', '/panou/parinte'] as const) {
      expect(exists(path), path).toBe(true);
      expect(ROUTE_META[path].noindex).toBe(true);
    }
    expect(readFileSync('src/app/sitemap.ts', 'utf8')).not.toContain('/panou');
  });

  it('the class a parent chooses leads to a page of sheets that exists', () => {
    const paths = LANDING_CLASSES.map((c) => c.path);
    for (const s of CHILD_STAGES) expect(paths, s.id).toContain(STAGE_TOPICS[s.level].href);
  });

  it('links to the heavy routes are not fetched ahead of the click', () => {
    expect([...HEAVY_ROUTES].sort()).toEqual(['/advent', '/book', '/generator', '/grupa']);
    for (const href of HEAVY_ROUTES) expect(linkPrefetch(href)).toBe(false);
    expect(linkPrefetch('/generator?fisa=x')).toBe(false);
    expect(linkPrefetch('/nume')).toBeUndefined();
    // the dashboards and the home page cards go through linkPrefetch or say prefetch={false} themselves
    const teacher = readFileSync('src/app/panou/cadru/page.tsx', 'utf8');
    for (const m of teacher.matchAll(/<Link href="(\/(?:generator|grupa|book|advent))"([^>]*)>/g)) expect(m[2], m[1]).toContain('prefetch={false}');
  });

  it('the dashboards, the menu and the home page cards do not import the sheet engine', () => {
    const files = ['src/app/panou/cadru/page.tsx', 'src/app/panou/parinte/page.tsx', 'src/components/dashboard/dash-card.tsx', 'src/components/home/role-cards.tsx', 'src/components/layout/navbar.tsx', 'src/components/layout/nav-items.ts', 'src/stores/role-store.ts', 'src/lib/role-links.ts', 'src/lib/advent-season.ts'];
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from '@\/lib\/(worksheet|glyphs|pdf)\//);
  });
});
