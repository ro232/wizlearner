import type { Metadata } from 'next';
import { BRAND_NAME } from '@/lib/brand';

/**
 * Titles, descriptions and canonical addresses of the pages that cannot export `metadata`
 * themselves (their page.tsx is a client component); each route's layout.tsx reads from here.
 * Addresses are relative: the root layout's `metadataBase` (SITE_URL) makes them absolute.
 */

export const SITE_NAME = BRAND_NAME;
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

export const DEFAULT_TITLE = 'Fișe de lucru pe programă, de la grădiniță la clasa a IV-a';
export const DEFAULT_DESCRIPTION =
  'Fișe PDF de la grădiniță la clasa a IV-a, cu codul competenței pe pagină. Evaluări, planificare și fișe cu numele fiecărui copil.';

/** The shared preview image for links sent on WhatsApp, Facebook etc. (src/app/opengraph-image.tsx). */
export const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: `${BRAND_NAME} – fișe de lucru pe programă, de la grădiniță la clasa a IV-a` };

interface PageMeta {
  /** Full <title> when `absolute`, otherwise the part before „ · <brand>”. */
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  noindex?: boolean;
  type?: 'website' | 'article';
}

/** Everything a page needs: unique title and description, canonical, Open Graph and the share image. */
export function pageMetadata({ title, description, path, absoluteTitle, noindex, type = 'website' }: PageMeta): Metadata {
  const full = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: full, description, url: path, type, siteName: SITE_NAME, locale: 'ro_RO', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: full, description, images: [OG_IMAGE.url] },
  };
}

/** Static routes. The keys are the addresses; every indexable title and description is unique. */
export const ROUTE_META = {
  '/': { title: DEFAULT_TITLE, absoluteTitle: true, description: DEFAULT_DESCRIPTION },
  '/generator': {
    title: 'Generator de fișe: litere, cifre, matematică',
    description: 'Alegi literele, cifrele sau exercițiile, pui numele copilului și descarci fișa PDF pe loc. Cu ordinea liniilor și diacriticele românești.',
  },
  '/caiete': {
    title: 'Caiete de scris gata făcute, PDF de printat',
    description: 'Caiete întregi de printat: alfabetul de tipar și de mână, cifrele și exercițiile grafice, pe niveluri. Alegi caietul și descarci PDF-ul.',
  },
  '/nume': {
    title: 'Fișa cu numele copilului de trasat',
    description: 'Scrii numele copilului și primești pe loc fișa de trasat, cu diacritice corecte, de tipar sau de mână. PDF A4 gata de printat, fără cont.',
  },
  '/advent': {
    title: 'Calendar de Advent cu fișe de lucru, cu numele copilului',
    absoluteTitle: true,
    description: 'O fișă pe zi, de la 1 la 24 decembrie, plus coperta cu numele copilului. Pentru grădiniță, clasa pregătitoare și clasa I. PDF gratuit, fără cont.',
  },
  '/grupa': {
    title: 'Fișe cu numele fiecărui copil din grupă',
    description: 'Lipești lista grupei și primești câte o fișă cu numele fiecărui copil, literele săptămânii și cuvintele temei. Numele rămân în browserul tău.',
  },
  '/planse': {
    title: 'Planșe, cartonașe și diplome pentru clasă',
    description: 'Alfabetul pentru perete, cartonașe și jetoane de decupat, diplome cu numele copiilor, orarul și panoul „Ziua de azi”. PDF A4 gata de printat.',
  },
  '/book': {
    title: 'Caiet de scris pentru Amazon KDP, cu copertă',
    description: 'Faci un caiet de scris de 60 de pagini pentru Amazon KDP: interior și copertă la dimensiunile cerute, în română sau engleză, ca PDF.',
  },
  '/preturi': {
    title: 'Prețuri: gratuit sau varianta completă',
    description: 'Ce primești gratuit și ce aduce varianta completă: tot alfabetul, fișe pentru toată grupa, orice cuvânt de trasat și caietul KDP fără filigran.',
  },
  // The two dashboards: personal start pages, not for search engines.
  '/panou/cadru': {
    title: 'Panoul cadrului didactic',
    description: 'Fișe pentru toată grupa, fișe pe programă, planificare, caiete și planșe: uneltele de zi cu zi ale educatoarei și ale învățătoarei.',
    noindex: true,
  },
  '/panou/parinte': {
    title: 'Fișe pentru copilul tău',
    description: 'Alegi vârsta sau clasa copilului și printezi acasă fișa cu numele lui, caiete de lucru și fișe pe teme. Fără cont.',
    noindex: true,
  },
  '/cont': { title: 'Contul tău', description: 'Fișele salvate, copiii tăi, istoricul descărcărilor și abonamentul ' + BRAND_NAME + '.', noindex: true },
  '/auth/login': { title: 'Intră în cont', description: 'Intră în contul ' + BRAND_NAME + ' sau creează unul, cu Google sau cu adresa de e-mail.', noindex: true },
} satisfies Record<string, Omit<PageMeta, 'path'>>;

export type StaticRoute = keyof typeof ROUTE_META;

export function routeMetadata(path: StaticRoute): Metadata {
  return pageMetadata({ ...ROUTE_META[path], path });
}
