import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLASS_PAGES, SHEET_PRESETS, presetById, presetConfig } from '@/lib/curriculum/presets';
import { sheetCompetenceLabel, sheetCompetences } from '@/lib/curriculum/sheet';
import { findCompetence } from '@/lib/curriculum';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { DESCRIPTION_MAX, ROUTE_META, TITLE_MAX } from '@/lib/seo/metadata';
import { SEO_SHEETS } from '@/lib/seo/catalog';
import { absoluteUrl } from '@/lib/seo/site';
import {
  LANDING_CLASSES, LANDING_INDEX, LANDING_PAGES, LANDING_ROOT, freeAccess, landingJsonLd, landingPage, landingText, sameClassPages, sameTopicPages, topicPresets, wordCount,
} from '@/lib/seo/landing';
import { TOPICS } from '@/lib/seo/landing-topics';
import sitemap from '@/app/sitemap';

const CEDILLA = /[şţŞŢ]/;

describe('„Fișe de lucru” landing pages', () => {
  it('are many, one per topic and class, with clean unique addresses', () => {
    expect(LANDING_PAGES.length).toBeGreaterThan(70);
    const paths = LANDING_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of LANDING_PAGES) {
      expect(p.path).toMatch(/^\/fise-de-lucru\/[a-z0-9-]+\/[a-z0-9-]+$/);
      expect(CLASS_PAGES.map((c) => c.slug)).toContain(p.cls.slug);
    }
    expect(new Set(TOPICS.map((t) => t.slug)).size).toBe(TOPICS.length);
    // every topic has at least one class, every class has topics
    for (const t of TOPICS) expect(LANDING_PAGES.some((p) => p.topic === t), t.slug).toBe(true);
    for (const c of LANDING_CLASSES) expect(c.groups.flatMap((g) => g.pages).length, c.cls.slug).toBeGreaterThan(10);
  });

  it('cover the searches they were made for', () => {
    for (const [clasa, subiect, h1] of [
      ['clasa-1', 'adunari', 'Fișe adunări clasa I'],
      ['clasa-pregatitoare', 'scaderi', 'Fișe scăderi clasa pregătitoare'],
      ['clasa-2', 'ceasul', 'Fișe ceasul clasa a II-a'],
      ['clasa-2', 'tabla-inmultirii', 'Fișe tabla înmulțirii clasa a II-a'],
      ['clasa-1', 'bani', 'Fișe bani clasa I'],
      ['clasa-1', 'probleme', 'Fișe probleme clasa I'],
      ['clasa-1', 'citire', 'Fișe citire clasa I'],
      ['clasa-1', 'despartirea-in-silabe', 'Fișe despărțire în silabe clasa I'],
      ['gradinita', 'sunetul-initial', 'Fișe sunetul inițial grădiniță'],
      ['gradinita', 'grafisme', 'Fișe grafisme grădiniță'],
      ['gradinita', 'labirint', 'Fișe labirint grădiniță'],
      ['gradinita', 'coloreaza-dupa-cod', 'Fișe colorează după cod grădiniță'],
      ['clasa-pregatitoare', 'orientare-in-spatiu', 'Fișe orientare în spațiu clasa pregătitoare'],
      ['gradinita', 'sortare', 'Fișe sortare grădiniță'],
      ['clasa-pregatitoare', 'explorarea-mediului', 'Fișe explorarea mediului clasa pregătitoare'],
      ['gradinita', 'matematica', 'Fișe matematică grădiniță'],
      ['clasa-1', 'evaluare-matematica', 'Evaluare matematică clasa I'],
      ['clasa-2', 'evaluare-citire', 'Evaluare citire clasa a II-a'],
    ]) {
      expect(landingPage(clasa, subiect)?.h1, `${clasa}/${subiect}`).toBe(h1);
    }
    // a class gets a topic only where the programme has it
    expect(landingPage('gradinita', 'adunari')).toBeUndefined();
    expect(landingPage('clasa-1', 'tabla-inmultirii')).toBeUndefined();
    expect(landingPage('clasa-pregatitoare', 'ceasul')).toBeUndefined();
    expect(landingPage('gradinita', 'explorarea-mediului')).toBeUndefined();
  });

  it('every sheet on a page exists for that class and prints a code of that class (or is an evaluation, or a codeless game)', () => {
    for (const p of LANDING_PAGES) {
      expect(p.variants.length, p.path).toBeGreaterThan(0);
      for (const v of p.variants) {
        const preset = presetById(v.preset.id);
        expect(preset, `${p.path} ${v.preset.id}`).toBeTruthy();
        expect(!preset!.levels || preset!.levels.includes(p.level), `${p.path} ${v.preset.id}`).toBe(true);
        const config = presetConfig(preset!, p.level);
        expect(config.curriculumLevel).toBe(p.level);
        expect(hasContent(config, 'full'), `${p.path} ${v.preset.id}`).toBe(true);
        expect(buildWorksheetPages(config, 'full').length, `${p.path} ${v.preset.id}`).toBeGreaterThan(0);
        const refs = sheetCompetences(config, p.level);
        if (p.topic.codeless) expect(refs, `${p.path} ${v.preset.id}`).toEqual([]);
        else if (!preset!.evaluation) expect(refs.length, `${p.path} ${v.preset.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('every button opens the generator on a preset that exists, for the page’s class', () => {
    for (const p of LANDING_PAGES) {
      for (const href of [p.cta.href, ...p.variants.map((v) => v.href)]) {
        const url = new URL(href, 'https://x.ro');
        expect(url.pathname, href).toBe('/generator');
        const preset = presetById(url.searchParams.get('fisa') ?? '');
        expect(preset, href).toBeTruthy();
        expect(url.searchParams.get('clasa'), href).toBe(p.level);
        expect(topicPresets(p.topic, p.level)).toContain(preset);
      }
      expect(p.cta).toBe(p.variants[0]);
    }
  });

  it('the competences shown are verbatim from the programme, and the printed label names them', () => {
    for (const p of LANDING_PAGES) {
      if (p.topic.codeless) {
        expect(p.competences, p.path).toEqual([]);
        expect(p.sheetLabel, p.path).toBeNull();
        continue;
      }
      expect(p.competences.length, p.path).toBeGreaterThan(0);
      expect(p.sheetLabel).toBe(sheetCompetenceLabel(presetConfig(p.cta.preset, p.level), p.level));
      for (const c of p.competences) {
        const found = p.variants.flatMap((v) => sheetCompetences(presetConfig(v.preset, p.level), p.level)).map((r) => findCompetence(r)?.text);
        expect(found, `${p.path} ${c.code}`).toContain(c.text);
      }
      // the label printed on the main sheet carries a code listed on the page
      expect(p.competences.some((c) => p.sheetLabel!.includes(c.code)), p.path).toBe(true);
    }
    const add = landingPage('clasa-1', 'adunari')!;
    expect(add.sheetLabel).toBe('Competența specifică 1.4 · Matematică și explorarea mediului, clasa I');
    expect(add.competences.find((c) => c.code === '1.4')?.text).toBe('Efectuarea de adunări și scăderi, mental și în scris, în concentrul 0-100, recurgând frecvent la numărare');
  });

  it('titles and descriptions fit search results and are unique across the whole site', () => {
    const all = [
      ...LANDING_PAGES.map((p) => ({ path: p.path, title: p.title, description: p.description })),
      ...LANDING_CLASSES.map((c) => ({ path: c.path, title: c.title, description: c.description })),
      { path: LANDING_INDEX.path, title: LANDING_INDEX.title, description: LANDING_INDEX.description },
    ];
    for (const p of all) {
      expect(p.title.length, `${p.path}: ${p.title}`).toBeLessThanOrEqual(TITLE_MAX);
      expect(p.description.length, `${p.path}: ${p.description}`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(p.description.length, p.path).toBeGreaterThan(80);
    }
    const others = [...Object.values(ROUTE_META).map((m) => m.title), ...SEO_SHEETS.map((s) => s.title)];
    const titles = [...all.map((p) => p.title), ...others];
    expect(new Set(titles).size).toBe(titles.length);
    const descriptions = [...all.map((p) => p.description), ...Object.values(ROUTE_META).map((m) => m.description), ...SEO_SHEETS.map((s) => s.description)];
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const p of LANDING_PAGES) expect(p.title.startsWith(p.keyword), p.path).toBe(true);
  });

  it('each page has enough text of its own, without keyword stuffing', () => {
    const bodies = new Set<string>();
    for (const p of LANDING_PAGES) {
      const text = landingText(p);
      expect(wordCount(text), p.path).toBeGreaterThanOrEqual(250);
      // the search phrase appears, but not over and over
      const phrase = p.keyword.toLowerCase();
      const hits = text.toLowerCase().split(phrase).length - 1;
      expect(hits, p.path).toBeGreaterThanOrEqual(1);
      expect(hits, p.path).toBeLessThanOrEqual(2);
      expect(p.body.length, p.path).toBeGreaterThanOrEqual(3);
      // no two pages share their first paragraph (the one about this class)
      expect(bodies.has(p.body[0]), p.path).toBe(false);
      bodies.add(p.body[0]);
      expect(p.faq.length, p.path).toBeGreaterThanOrEqual(3);
      expect(p.faq.length, p.path).toBeLessThanOrEqual(4);
      expect(new Set(p.faq.map((f) => f.q)).size, p.path).toBe(p.faq.length);
    }
  });

  it('is written with ș and ț (comma below), never the cedilla forms', () => {
    for (const p of LANDING_PAGES) expect(landingText(p) + p.title + p.description, p.path).not.toMatch(CEDILLA);
    for (const c of LANDING_CLASSES) expect(c.title + c.description + c.h1).not.toMatch(CEDILLA);
    for (const f of ['src/lib/seo/landing.ts', 'src/lib/seo/landing-topics.ts', 'src/app/fise-de-lucru/page.tsx', 'src/app/fise-de-lucru/[clasa]/page.tsx', 'src/app/fise-de-lucru/[clasa]/[subiect]/page.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(CEDILLA);
    }
  });

  it('JSON-LD is valid: breadcrumbs to the page and the FAQ shown on it', () => {
    for (const p of LANDING_PAGES) {
      const [crumbs, faq] = landingJsonLd(p).map((s) => JSON.parse(s));
      expect(crumbs['@type']).toBe('BreadcrumbList');
      expect(crumbs.itemListElement.map((i: { item: string }) => i.item)).toEqual([absoluteUrl(LANDING_ROOT), absoluteUrl(`${LANDING_ROOT}/${p.cls.slug}`), absoluteUrl(p.path)]);
      expect(crumbs.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2, 3]);
      expect(faq['@type']).toBe('FAQPage');
      expect(faq.mainEntity).toHaveLength(p.faq.length);
      for (const [i, q] of faq.mainEntity.entries()) {
        expect(q['@type']).toBe('Question');
        expect(q.name).toBe(p.faq[i].q);
        expect(q.acceptedAnswer.text).toBe(p.faq[i].a);
      }
      for (const s of landingJsonLd(p)) expect(s).not.toContain('</');
    }
  });

  it('links: the same class and the same topic in other classes, all to existing pages', () => {
    const paths = new Set(LANDING_PAGES.map((p) => p.path));
    for (const p of LANDING_PAGES) {
      const same = sameClassPages(p);
      expect(same.length, p.path).toBeGreaterThan(3);
      for (const r of [...same, ...sameTopicPages(p)]) {
        expect(paths.has(r.path), r.path).toBe(true);
        expect(r).not.toBe(p);
      }
      for (const r of same) expect(r.cls).toBe(p.cls);
      for (const s of p.fise) expect(SEO_SHEETS).toContain(s);
    }
    expect(sameTopicPages(landingPage('clasa-1', 'adunari')!).map((p) => p.path)).toEqual(['/fise-de-lucru/clasa-pregatitoare/adunari', '/fise-de-lucru/clasa-2/adunari', '/fise-de-lucru/clasa-3/adunari', '/fise-de-lucru/clasa-4/adunari']);
    // grădiniță's „Cunoașterea mediului” and the school's „Explorarea mediului” link each other
    expect(sameTopicPages(landingPage('gradinita', 'cunoasterea-mediului')!).map((p) => p.cls.slug)).toEqual(['clasa-pregatitoare', 'clasa-1', 'clasa-2']);
    // letters link the free single-letter sheets instead of repeating them
    expect(landingPage('clasa-pregatitoare', 'litere-de-tipar')!.fise.length).toBe(SEO_SHEETS.filter((s) => s.kind === 'litere').length);
    expect(landingPage('clasa-1', 'litere-de-mana')!.fise.every((s) => s.slug.endsWith('-de-mana'))).toBe(true);
  });

  it('the free plan is described as the page builder applies it', () => {
    const at = (clasa: string, subiect: string) => landingPage(clasa, subiect)!.cta.free;
    expect(at('clasa-pregatitoare', 'adunari').kind).toBe('free');
    expect(at('clasa-1', 'adunari')).toMatchObject({ kind: 'partial', badge: 'Gratuit, cu numere până la 10' });
    expect(at('clasa-2', 'ceasul')).toMatchObject({ kind: 'partial', badge: 'Gratuit, cu ore fixe și jumătăți' });
    expect(at('clasa-2', 'tabla-inmultirii').badge).toBe('Gratuit, cu tabla înmulțirii cu 2');
    expect(at('gradinita', 'labirint').kind).toBe('free');
    expect(freeAccess(presetConfig(presetById('mate-calendar')!, 'II')).kind).toBe('paid');
    // free sheets really are free: a free build has the same pages as the full one, minus the footer
    for (const p of LANDING_PAGES.filter((x) => x.cta.free.kind === 'free')) {
      const config = presetConfig(p.cta.preset, p.level);
      expect(buildWorksheetPages(config, 'free').length, p.path).toBe(buildWorksheetPages(config, 'full').length);
    }
  });

  it('the sitemap lists the index, the class pages and every topic page', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    expect(urls.has(absoluteUrl(LANDING_ROOT))).toBe(true);
    for (const c of LANDING_CLASSES) expect(urls.has(absoluteUrl(c.path)), c.path).toBe(true);
    for (const p of LANDING_PAGES) expect(urls.has(absoluteUrl(p.path)), p.path).toBe(true);
  });

  it('the codeless games are presets of their own, opened only from here', () => {
    for (const id of ['labirint', 'gaseste-diferentele', 'gaseste-umbra']) {
      const preset = SHEET_PRESETS.find((x) => x.id === id)!;
      expect(preset.levels).toEqual(['presc']);
      expect(sheetCompetences(presetConfig(preset, 'presc'), 'presc')).toEqual([]);
    }
  });

  it('the index and the other pages link to it', () => {
    expect(readFileSync('src/components/layout/footer.tsx', 'utf8')).toContain('href="/fise-de-lucru"');
    expect(readFileSync('src/app/fise/page.tsx', 'utf8')).toContain('href="/fise-de-lucru"');
    expect(readFileSync('src/app/programa/page.tsx', 'utf8')).toContain('href="/fise-de-lucru"');
  });
});
