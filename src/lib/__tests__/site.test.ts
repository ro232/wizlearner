import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LOCAL_SITE_URL, SITE_URL, absoluteUrl, resolveSiteUrl, CONTENT_UPDATED } from '@/lib/seo/site';
import { ROUTE_META, TITLE_MAX, DESCRIPTION_MAX, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from '@/lib/seo/metadata';
import { SEO_SHEETS } from '@/lib/seo/catalog';
import { readOperator, operatorSentence, operatorDetails, missingOperatorFields, warnIfOperatorIncomplete } from '@/lib/legal';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

const FOREIGN = /worksheetwiz\.(com|ro)/i;

describe('public address of the site', () => {
  it('uses NEXT_PUBLIC_SITE_URL first, cleaned to an origin', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://exemplu.ro/' })).toBe('https://exemplu.ro');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: ' exemplu.ro ' })).toBe('https://exemplu.ro');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://exemplu.ro/ceva?x=1', VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app' })).toBe('https://exemplu.ro');
  });

  it('falls back to the Vercel production host, with https', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'proiect.vercel.app' })).toBe('https://proiect.vercel.app');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '', NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'proiect.vercel.app' })).toBe('https://proiect.vercel.app');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'nu e o adresa', VERCEL_PROJECT_PRODUCTION_URL: 'proiect.vercel.app' })).toBe('https://proiect.vercel.app');
  });

  it('is localhost when nothing is set, never a domain the project does not own', () => {
    expect(resolveSiteUrl({})).toBe(LOCAL_SITE_URL);
    expect(resolveSiteUrl({})).not.toMatch(FOREIGN);
    for (const f of ['src/lib/seo/site.ts', 'src/app/layout.tsx', 'src/app/sitemap.ts', 'src/app/robots.ts', '.env.example']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(FOREIGN);
    }
  });

  it('sitemap and robots are built from it', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.length).toBe(10 + SEO_SHEETS.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) {
      expect(u.startsWith(SITE_URL), u).toBe(true);
      expect(u).not.toMatch(FOREIGN);
    }
    expect(urls[0]).toBe(SITE_URL);
    expect(robots().sitemap).toBe(absoluteUrl('/sitemap.xml'));
    expect(JSON.stringify(robots())).not.toMatch(FOREIGN);
  });

  it('sitemap dates are the content date, not the build time', () => {
    expect(CONTENT_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const e of sitemap()) expect(e.lastModified).toBe(CONTENT_UPDATED);
  });
});

describe('titles and descriptions', () => {
  const pages = [
    ...Object.entries(ROUTE_META).map(([path, m]) => ({ path, noindex: 'noindex' in m && m.noindex, title: 'absoluteTitle' in m && m.absoluteTitle ? m.title : `${m.title} · ${SITE_NAME}`, description: m.description })),
    ...SEO_SHEETS.map((s) => ({ path: `/fise/${s.slug}`, noindex: false, title: s.title, description: s.description })),
  ];

  it('fit search results', () => {
    expect(DEFAULT_TITLE.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    for (const p of pages) {
      expect(p.title.length, `${p.path}: ${p.title}`).toBeLessThanOrEqual(TITLE_MAX);
      expect(p.description.length, `${p.path}: ${p.description}`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(p.description.length, p.path).toBeGreaterThan(50);
    }
  });

  it('are unique across the site', () => {
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });

  it('every client-rendered route has a layout that sets them', () => {
    for (const path of Object.keys(ROUTE_META).filter((p) => p !== '/')) {
      expect(readFileSync(`src/app${path}/layout.tsx`, 'utf8'), path).toContain(`routeMetadata('${path}')`);
    }
  });

  it('agreement: the picture is feminine or masculine', () => {
    const intro = (slug: string) => SEO_SHEETS.find((s) => s.slug === slug)!.intro[0];
    expect(intro('uneste-punctele-star')).toContain('steaua, pe care o poate colora');
    expect(intro('uneste-punctele-fish')).toContain('peștele, pe care îl poate colora');
  });
});

describe('company identification', () => {
  const full = readOperator({
    NEXT_PUBLIC_OPERATOR_NAME: 'Exemplu S.R.L.',
    NEXT_PUBLIC_OPERATOR_CUI: 'RO123',
    NEXT_PUBLIC_OPERATOR_REG_COM: 'J40/1/2020',
    NEXT_PUBLIC_OPERATOR_ADDRESS: 'Str. Exemplu 1, București',
    NEXT_PUBLIC_OPERATOR_EMAIL: 'contact@exemplu.ro',
    NEXT_PUBLIC_OPERATOR_PHONE: '+40 721 000 000',
  });

  it('names the company in full when the fields are set', () => {
    expect(operatorSentence(full)).toBe('WorksheetWiz este un serviciu al Exemplu S.R.L., cu sediul în Str. Exemplu 1, București, înregistrată la Registrul Comerțului sub nr. J40/1/2020, CUI RO123.');
    expect(operatorDetails(full).map((d) => d.label)).toEqual(['CUI', 'Nr. Reg. Com.', 'Sediu']);
    expect(missingOperatorFields(full)).toEqual([]);
  });

  it('never prints bracketed placeholders when fields are missing', () => {
    for (const env of [{}, { NEXT_PUBLIC_OPERATOR_NAME: '  ' }, { NEXT_PUBLIC_OPERATOR_NAME: '[Denumirea firmei]', NEXT_PUBLIC_OPERATOR_CUI: '[CUI]' }, { NEXT_PUBLIC_OPERATOR_NAME: 'Exemplu S.R.L.' }]) {
      const op = readOperator(env);
      const text = operatorSentence(op) + operatorDetails(op).map((d) => d.value).join(' ');
      expect(text).not.toMatch(/[[\]]|undefined|null/);
    }
    expect(operatorSentence(readOperator({}))).toBe('WorksheetWiz este un serviciu online de fișe de lucru pentru copii.');
    expect(operatorDetails(readOperator({}))).toEqual([]);
    for (const f of ['src/lib/legal.ts', 'src/app/termeni/page.tsx', 'src/app/confidentialitate/page.tsx', 'src/components/layout/footer.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\|\| '\[/);
    }
  });

  it('warns on the server about what is missing', () => {
    const logs: string[] = [];
    expect(warnIfOperatorIncomplete(readOperator({ NEXT_PUBLIC_OPERATOR_NAME: 'Exemplu S.R.L.' }), (m) => logs.push(m))).toContain('NEXT_PUBLIC_OPERATOR_PHONE');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('NEXT_PUBLIC_OPERATOR_REG_COM');
    warnIfOperatorIncomplete(full, (m) => logs.push(m));
    expect(logs).toHaveLength(1);
  });

  it('the footer links the consumer-dispute body and the legal pages, and not the closed EU platform', () => {
    const footer = readFileSync('src/components/layout/footer.tsx', 'utf8');
    for (const s of ['https://reclamatiisal.anpc.ro/', 'https://anpc.ro/', 'ANPC – Soluționarea alternativă a litigiilor', 'href="/termeni"', 'href="/confidentialitate"', 'href="/fise"', 'href="/preturi"']) expect(footer).toContain(s);
    expect(footer).not.toMatch(/ec\.europa\.eu|odr/i);
  });
});
