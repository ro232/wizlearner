import { LANDING_PAGES, landingPage } from '@/lib/seo/landing';
import { presetConfig } from '@/lib/curriculum/presets';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { pageToSvg } from '@/lib/glyphs/backends/svg';

/**
 * Page 1 of the main sheet of a „Fișe de lucru” page, as a static SVG drawn by the same engine as
 * the PDF (built once, at build time). Loaded by the page as an <img>, so the HTML stays light.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ clasa: p.cls.slug, subiect: p.topic.slug }));
}

/** Tenths of a millimetre are plenty at preview size and make the file about a third smaller. */
const roundNumbers = (svg: string) => svg.replace(/(\d+\.\d)\d+/g, '$1');

export function GET(_req: Request, { params }: { params: { clasa: string; subiect: string } }) {
  const page = landingPage(params.clasa, params.subiect);
  if (!page) return new Response('Not found', { status: 404 });
  const [first] = buildWorksheetPages(presetConfig(page.cta.preset, page.level), 'full');
  return new Response(roundNumbers(pageToSvg(first)), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
