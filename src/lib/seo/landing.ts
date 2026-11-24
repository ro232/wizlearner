import type { WorksheetConfig } from '@/types';
import { findCompetence, type CompetenceRef } from '@/lib/curriculum';
import { CLASS_PAGES, presetById, presetConfig, presetHref, type ClassPage, type SheetPreset } from '@/lib/curriculum/presets';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { isItemAllowed } from '@/lib/access';
import { FREE_MATH_RANGE, TOPIC_MATH_TYPES, mathRangeOf } from '@/lib/worksheet/math';
import { FREE_CLOCK_STEPS, clockStepOf } from '@/lib/worksheet/clock';
import { FREE_MATH_TABLE, isMulType, mathTableOf } from '@/lib/worksheet/multiply';
import { SEO_SHEETS, type SeoSheet } from './catalog';
import { TITLE_MAX } from './metadata';
import { absoluteUrl } from './site';
import { countOf } from '@/components/worksheet/plural';
import { TOPICS, type Area, type Ctx, type Faq, type Topic } from './landing-topics';

/**
 * The „Fișe de lucru” landing pages: /fise-de-lucru (all classes), /fise-de-lucru/[clasa] (the topics
 * of a class) and /fise-de-lucru/[clasa]/[subiect] (one topic in one class: „Fișe adunări clasa I”).
 *
 * The list is computed: a topic gets a page in a class when at least one of its presets exists there
 * (preset.levels) and prints a code of that class's programme (sheet.ts), or is an evaluation, or the
 * topic is one of the few without a code. Every page's button opens that very preset in the generator.
 */

export const LANDING_ROOT = '/fise-de-lucru';

/** How the class is written after the search phrase: „Fișe adunări clasa I”, „Fișe grafisme grădiniță”. */
export const CLASS_NAME: Record<SchoolLevel, string> = { presc: 'grădiniță', CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a', III: 'clasa a III-a', IV: 'clasa a IV-a' };
/** „pentru clasa I”, „pentru grădiniță” */
const FOR: Record<SchoolLevel, string> = { presc: 'pentru grădiniță', CP: 'pentru clasa pregătitoare', I: 'pentru clasa I', II: 'pentru clasa a II-a', III: 'pentru clasa a III-a', IV: 'pentru clasa a IV-a' };

/** The number range the class's math sheets open with (presets.ts MATH_RANGE). */
const CLASS_RANGE: Record<SchoolLevel, number> = { presc: 10, CP: 10, I: 100, II: 1000, III: 10000, IV: 1000000 };

export function areaTitle(area: Area, level: SchoolLevel): string {
  if (level === 'presc') return { clr: 'Limbaj, citit și scris', mem: 'Matematică și cunoașterea lumii', joc: 'Jocuri pe hârtie', eval: 'Evaluare' }[area];
  if (level === 'III' || level === 'IV') return { clr: 'Limba și literatura română', mem: 'Matematică', joc: 'Jocuri pe hârtie', eval: 'Evaluări' }[area];
  return { clr: 'Comunicare în limba română', mem: 'Matematică și explorarea mediului', joc: 'Jocuri pe hârtie', eval: 'Evaluări' }[area];
}
export const AREA_ORDER: Area[] = ['clr', 'mem', 'joc', 'eval'];

export interface FreeAccess {
  kind: 'free' | 'partial' | 'paid';
  /** Short badge: „Gratuit”, „Gratuit, cu numere până la 10”, „Varianta completă”. */
  badge: string;
  /** What the free plan leaves out, for the FAQ: „concentrul 0–100”. */
  full: string[];
  /** What the free plan gives, for the FAQ: „cu numere până la 10”. */
  free: string[];
}

/** What the free plan gives of a sheet (the same rules the page builder applies: access.ts, math.ts). */
export function freeAccess(config: WorksheetConfig): FreeAccess {
  const items = config.selectedItems;
  const allowed = items.filter((i) => isItemAllowed(i, config.category, 'free'));
  if (!allowed.length) return { kind: 'paid', badge: 'Varianta completă', full: ['fișa întreagă'], free: [] };
  const free: string[] = [];
  const full: string[] = [];
  if (allowed.length < items.length) {
    free.push('cu o parte din exerciții');
    full.push('restul exercițiilor');
  }
  if (config.category === 'math') {
    const range = mathRangeOf(config);
    // the clock, the tables, the calendar, measures … do not use the range („Grupe egale” does)
    const usesRange = allowed.some((i) => i === 'groups' || !(TOPIC_MATH_TYPES as readonly string[]).includes(i));
    if (usesRange && range > FREE_MATH_RANGE) {
      free.push(`cu numere până la ${FREE_MATH_RANGE}`);
      full.push(`concentrul 0–${range}`);
    }
    if (allowed.some((i) => i === 'clock' || i === 'clockdraw') && !FREE_CLOCK_STEPS.includes(clockStepOf(config))) {
      free.push('cu ore fixe și jumătăți');
      full.push('ceasul cu sferturi și minute');
    }
    if (allowed.some(isMulType) && mathTableOf(config) !== FREE_MATH_TABLE) {
      free.push(`cu tabla înmulțirii cu ${FREE_MATH_TABLE}`);
      full.push('celelalte table ale înmulțirii');
    }
  }
  if (!free.length) return { kind: 'free', badge: 'Gratuit', full, free };
  return { kind: 'partial', badge: `Gratuit, ${free.join(', ')}`, full, free };
}

export interface LandingVariant {
  preset: SheetPreset;
  title: string;
  text: string;
  href: string;
  free: FreeAccess;
}

export interface LandingCompetence {
  /** As teachers write it: „1.4”, „D.3.4”. */
  code: string;
  /** „Competența specifică 1.4” / „Comportamentul D.3.4”. */
  name: string;
  subject: string;
  /** Verbatim from the programme. */
  text: string;
}

export interface LandingPage {
  topic: Topic;
  cls: ClassPage;
  level: SchoolLevel;
  path: string;
  /** The search phrase: „Fișe adunări clasa I”. */
  keyword: string;
  h1: string;
  title: string;
  description: string;
  lead: string;
  body: string[];
  variants: LandingVariant[];
  competences: LandingCompetence[];
  /** The line the sheet prints at the bottom of each page (null for the topics without a code). */
  sheetLabel: string | null;
  faq: Faq[];
  cta: LandingVariant;
  /** Page 1 of the main sheet, as SVG (route next to the page). */
  preview: string;
  /** Free single sheets at /fise to link (letters, digits …). */
  fise: SeoSheet[];
}

const SUBJECT: Record<string, string> = {
  'et-presc': 'Curriculum pentru educație timpurie',
  'clr-p-ii': 'Comunicare în limba română',
  'mem-p-ii': 'Matematică și explorarea mediului',
  'llr-iii-iv': 'Limba și literatura română',
  'mate-iii-iv': 'Matematică',
};

function refCode(r: CompetenceRef): string {
  return r.programme === 'et-presc' ? `${r.domain}.${r.code}` : r.code;
}

/** The presets of a topic that exist for a class and fit it (a code of the class, an evaluation, or a codeless topic). */
export function topicPresets(topic: Topic, level: SchoolLevel): SheetPreset[] {
  if (topic.levels && !topic.levels.includes(level)) return [];
  return topic.presets
    .filter((tp) => !tp.levels || tp.levels.includes(level))
    .map((tp) => presetById(tp.id))
    .filter((p): p is SheetPreset => !!p)
    .filter((p) => {
      if (p.levels && !p.levels.includes(level)) return false;
      if (topic.codeless) return !!p.levels?.includes(level);
      return !!p.evaluation || sheetCompetences(presetConfig(p, level), level).length > 0;
    });
}

function phraseOf(topic: Topic, level: SchoolLevel): string {
  return typeof topic.phrase === 'function' ? topic.phrase(level) : topic.phrase;
}

/** The first wording that fits the limit. */
function fit(options: string[], max: number): string {
  return options.find((o) => o.length <= max) ?? options[options.length - 1];
}

/** „a”, „a și b”, „a, b și c” */
function listRo(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} și ${items[items.length - 1]}` : items.join('');
}

function sharedFaq(page: Omit<LandingPage, 'faq'>, own: Faq[]): Faq[] {
  const out = [...own];
  if (page.topic.codeless) {
    out.push(
      page.level === 'presc'
        ? {
          q: 'De ce nu are fișa un cod din curriculum?',
          a: 'Pentru că niciun comportament din Curriculumul pentru educație timpurie nu descrie exact acest joc. Preferăm să nu tipărim pe fișă un cod aproximativ; dacă vrei, îl treci tu în planificare, după activitatea în care o folosești.',
        }
        : {
          q: 'De ce nu are fișa un cod din programă?',
          a: 'Pentru că nicio competență specifică din programă nu numește acest exercițiu, iar programa spune că „conținuturile nu se tratează în sine”. Preferăm să nu tipărim pe fișă un cod aproximativ; dacă vrei, îl treci tu în planificare, după lecția în care o folosești.',
        },
    );
  }
  if (page.sheetLabel) {
    out.push({
      q: page.level === 'presc' ? 'Se tipărește comportamentul din curriculum pe fișă?' : 'Se tipărește competența din programă pe fișă?',
      a: `Da. Când deschizi fișa de aici, generatorul știe clasa și scrie jos, pe fiecare pagină: „${page.sheetLabel}”. O poți pune direct în portofoliu sau o poți trece în planificare.`,
    });
  }
  const { free } = page.cta;
  const freeAnswer =
    free.kind === 'free'
      ? 'Da. O deschizi în generator și o descarci ca PDF, fără cont și fără card. Poți pune numele copilului în antet și o poți printa de câte ori ai nevoie.'
      : free.kind === 'partial'
        ? `Varianta gratuită se descarcă fără cont, ${free.free.join(', ')}; ${listRo(free.full)} ${free.full.length > 1 ? 'fac' : 'face'} parte din varianta completă.`
        : 'Fișa face parte din varianta completă. Gratuit poți încerca celelalte fișe de pe pagină, marcate „Gratuit”.';
  out.push({ q: 'Fișa este gratuită?', a: freeAnswer });
  if (out.length < 4 && page.cta.preset.config.category === 'math' && !page.cta.preset.evaluation) {
    out.push({
      q: 'Fișa are și răspunsurile?',
      a: 'Da. În generator bifezi „Pagină cu răspunsuri la final” și primești, după fișă, o pagină separată cu rezultatele, ca să verifici repede sau să-l lași pe copil să se corecteze singur.',
    });
  }
  if (out.length < 4) {
    out.push({
      q: 'Pot scrie numele copilului pe fișă?',
      a: 'Da. În generator scrii numele copilului, iar el apare în antet, pe rândul „Nume”, pe fiecare pagină. Restul fișei rămâne la fel.',
    });
  }
  return out.slice(0, 4);
}

function buildPage(topic: Topic, cls: ClassPage): LandingPage | null {
  const level = cls.level;
  const presets = topicPresets(topic, level);
  if (!presets.length) return null;
  const ids = new Set(presets.map((p) => p.id));
  const ctx: Ctx = { level, name: CLASS_NAME[level], range: CLASS_RANGE[level], has: (id) => ids.has(id) };
  const copy = topic.copy(ctx);
  const keyword = `${phraseOf(topic, level)} ${CLASS_NAME[level]}`;
  const variants: LandingVariant[] = presets.map((p) => ({
    preset: p,
    title: p.title,
    text: p.text,
    href: presetHref(p, level),
    free: freeAccess(presetConfig(p, level)),
  }));
  // the competences of all the page's sheets, each once, in the programme's order
  const seen = new Set<string>();
  const competences: LandingCompetence[] = [];
  for (const p of presets) {
    for (const r of sheetCompetences(presetConfig(p, level), level)) {
      const key = `${r.programme}|${refCode(r)}`;
      const c = findCompetence(r);
      if (seen.has(key) || !c) continue;
      seen.add(key);
      competences.push({
        code: refCode(r),
        name: r.programme === 'et-presc' ? `Comportamentul ${refCode(r)}` : `Competența specifică ${r.code}`,
        subject: SUBJECT[r.programme] ?? r.programme,
        text: c.text,
      });
    }
  }
  competences.sort((a, b) => `${a.subject}${a.code}`.localeCompare(`${b.subject}${b.code}`, 'ro', { numeric: true }));
  const path = `${LANDING_ROOT}/${cls.slug}/${topic.slug}`;
  const base: Omit<LandingPage, 'faq'> = {
    topic,
    cls,
    level,
    path,
    keyword,
    h1: keyword,
    // „pe programă” only where the sheet prints a code of a school programme
    title: fit([...(level !== 'presc' && !topic.codeless ? [`${keyword}, pe programă – PDF de printat`] : []), `${keyword} – PDF de printat`, `${keyword} – PDF`, keyword], TITLE_MAX),
    description: copy.description,
    lead: copy.lead,
    body: copy.body,
    variants,
    competences,
    sheetLabel: topic.codeless ? null : sheetCompetenceLabel(presetConfig(presets[0], level), level),
    cta: variants[0],
    preview: `${path}/fisa.svg`,
    fise: topic.fiseKinds ? SEO_SHEETS.filter((s) => topic.fiseKinds!.includes(s.kind as never) && (s.kind !== 'jocuri' || s.slug.startsWith('uneste-punctele'))) : [],
  };
  return { ...base, faq: sharedFaq(base, copy.faq) };
}

export const LANDING_PAGES: LandingPage[] = CLASS_PAGES.flatMap((cls) => TOPICS.map((t) => buildPage(t, cls)).filter((p): p is LandingPage => !!p));

export function landingPage(clasa: string, subiect: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.cls.slug === clasa && p.topic.slug === subiect);
}

export function classLandingPages(clasa: string): LandingPage[] {
  return LANDING_PAGES.filter((p) => p.cls.slug === clasa);
}

/** The same topic in the other classes (with its family: „Cunoașterea mediului” ↔ „Explorarea mediului”). */
export function sameTopicPages(page: LandingPage): LandingPage[] {
  const family = page.topic.family ?? page.topic.slug;
  return LANDING_PAGES.filter((p) => p !== page && (p.topic.family ?? p.topic.slug) === family);
}

/** Other topics of the same class: the same area first, then the others (at most `count`). */
export function sameClassPages(page: LandingPage, count = 8): LandingPage[] {
  const others = classLandingPages(page.cls.slug).filter((p) => p !== page);
  return [...others.filter((p) => p.topic.area === page.topic.area), ...others.filter((p) => p.topic.area !== page.topic.area)].slice(0, count);
}

// ───────────────────────── the class pages and the index ─────────────────────────

export interface LandingClass {
  cls: ClassPage;
  path: string;
  h1: string;
  title: string;
  description: string;
  groups: { area: Area; title: string; pages: LandingPage[] }[];
}

const CLASS_EXAMPLES: Record<SchoolLevel, string> = {
  presc: 'grafisme, sunetul inițial, cifre, sortare, anotimpuri',
  CP: 'litere, silabe, adunări, bani, explorarea mediului',
  I: 'citire, litere de mână, adunări, ceasul, probleme',
  II: 'citire, tabla înmulțirii, împărțiri, ceasul, calendarul',
  III: 'texte cu întrebări, ortograme, compuneri, fracții',
  IV: 'lectură, părți de vorbire, scrisoarea, perimetrul',
};

export const LANDING_CLASSES: LandingClass[] = CLASS_PAGES.map((cls) => {
  const pages = classLandingPages(cls.slug);
  const name = CLASS_NAME[cls.level];
  return {
    cls,
    path: `${LANDING_ROOT}/${cls.slug}`,
    h1: `Fișe de lucru ${FOR[cls.level]}`,
    title: fit([`Fișe de lucru ${name}, pe teme – PDF de printat`, `Fișe de lucru ${name}, pe teme – PDF`, `Fișe de lucru ${name}`], TITLE_MAX),
    description: `${countOf(pages.length, 'temă', 'teme')} de fișe ${FOR[cls.level]}: ${CLASS_EXAMPLES[cls.level]}. Cu ${cls.level === 'presc' ? 'comportamentul vizat' : 'competența din programă'} pe fișă, PDF de printat.`,
    groups: AREA_ORDER.map((area) => ({ area, title: areaTitle(area, cls.level), pages: pages.filter((p) => p.topic.area === area) })).filter((g) => g.pages.length),
  };
});

export function landingClass(clasa: string): LandingClass | undefined {
  return LANDING_CLASSES.find((c) => c.cls.slug === clasa);
}

export const LANDING_INDEX = {
  path: LANDING_ROOT,
  title: 'Fișe de lucru pe clase: de la grădiniță la clasa a IV-a',
  description: `${countOf(LANDING_PAGES.length, 'fișă', 'fișe')} de lucru pe teme, de la grădiniță la clasa a IV-a, cu competența din programă tipărită pe fișă. PDF de printat.`,
};

// ───────────────────────── structured data ─────────────────────────

type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function landingCrumbs(page: LandingPage): Crumb[] {
  return [
    { name: 'Fișe de lucru', path: LANDING_ROOT },
    { name: page.cls.title, path: `${LANDING_ROOT}/${page.cls.slug}` },
    { name: page.topic.label, path: page.path },
  ];
}

export function faqJsonLd(faq: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** The JSON-LD of a topic page, serialised for a <script> tag („<” escaped so a text can never close it). */
export function landingJsonLd(page: LandingPage): string[] {
  return [breadcrumbJsonLd(landingCrumbs(page)), faqJsonLd(page.faq)].map((o) => JSON.stringify(o).replace(/</g, '\\u003c'));
}

/** All the text a visitor reads on a topic page (for the word-count check). */
export function landingText(page: LandingPage): string {
  return [
    page.h1,
    page.lead,
    ...page.body,
    ...page.variants.flatMap((v) => [v.title, v.text]),
    ...page.competences.flatMap((c) => [c.name, c.text]),
    ...page.faq.flatMap((f) => [f.q, f.a]),
  ].join(' ');
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
