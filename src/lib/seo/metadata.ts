import type { Metadata } from 'next';

/**
 * Titles, descriptions and canonical addresses of the pages that cannot export `metadata`
 * themselves (their page.tsx is a client component); each route's layout.tsx reads from here.
 * Addresses are relative: the root layout's `metadataBase` (SITE_URL) makes them absolute.
 */

export const SITE_NAME = 'WorksheetWiz';
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

export const DEFAULT_TITLE = 'WorksheetWiz – fișe de scris pentru grădiniță și clasa I';
export const DEFAULT_DESCRIPTION =
  'Fișe de trasat litere, cifre și numele copilului, cu alfabetul românesc complet (Ă Â Î Ș Ț) și ordinea liniilor. PDF gata de printat.';

/** The shared preview image for links sent on WhatsApp, Facebook etc. (src/app/opengraph-image.tsx). */
export const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'WorksheetWiz – fișe de scris pentru grădiniță și clasa I' };

interface PageMeta {
  /** Full <title> when `absolute`, otherwise the part before „ · WorksheetWiz”. */
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
  '/grupa': {
    title: 'Fișe cu numele fiecărui copil din grupă',
    description: 'Lipești lista grupei și primești câte o fișă cu numele fiecărui copil, literele săptămânii și cuvintele temei. Numele rămân în browserul tău.',
  },
  '/book': {
    title: 'Caiet de scris pentru Amazon KDP, cu copertă',
    description: 'Faci un caiet de scris de 60 de pagini pentru Amazon KDP: interior și copertă la dimensiunile cerute, în română sau engleză, ca PDF.',
  },
  '/preturi': {
    title: 'Prețuri: gratuit sau varianta completă',
    description: 'Ce primești gratuit și ce aduce varianta completă: tot alfabetul, fișe pentru toată grupa, orice cuvânt de trasat și caietul KDP fără filigran.',
  },
  '/cont': { title: 'Contul tău', description: 'Fișele salvate, copiii tăi, istoricul descărcărilor și abonamentul WorksheetWiz.', noindex: true },
  '/auth/login': { title: 'Intră în cont', description: 'Intră în contul WorksheetWiz sau creează unul, cu Google sau cu adresa de e-mail.', noindex: true },
} satisfies Record<string, Omit<PageMeta, 'path'>>;

export type StaticRoute = keyof typeof ROUTE_META;

export function routeMetadata(path: StaticRoute): Metadata {
  return pageMetadata({ ...ROUTE_META[path], path });
}
