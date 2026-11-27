import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { flattenOps } from '@/lib/glyphs/geometry';
import { opToSvg } from '@/lib/glyphs/backends/svg';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/brand';

/**
 * The picture shown when a link to the site is shared (WhatsApp, Facebook…): logo, one line of
 * text and a strip of a real sheet, drawn by the same engine as the PDFs. Built once, at build time.
 */
export const alt = `${BRAND_NAME} – fișe de lucru pe programă, de la grădiniță la clasa a IV-a`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Minimal alb: white, navy text, one blue accent, thin grey borders.
const INK = '#14213D';
const MUTED = '#545E73';
const ACCENT = '#2448E8';
const LINE = '#E6E9EF';

const SAMPLE: WorksheetConfig = { ...DEFAULT_CONFIG, alphabet: 'ro', letterMode: 'uppercase', selectedItems: ['A', 'Ă', 'Ș'], rowsPerPage: 5 };
/** The part of the A4 page (in mm) that holds the letter rows. */
const CROP = { x: 10, y: 33, w: 112, h: 80 };

function sheetStrip(): string {
  const [page] = buildWorksheetPages(SAMPLE, 'full');
  // Letters and ruling are vector paths; the page's text is left out (the renderer has no fonts inside images).
  const body = flattenOps(page.ops).filter((op) => op.t !== 'text').map((op) => opToSvg(op, 'sans-serif')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}" width="${CROP.w * 5}" height="${CROP.h * 5}"><rect x="${CROP.x}" y="${CROP.y}" width="${CROP.w}" height="${CROP.h}" fill="#ffffff"/>${body}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'src/app/fonts/inter-bold-og.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/inter-medium-og.ttf')),
  ]);
  const stripW = 500;
  const stripH = Math.round((stripW * CROP.h) / CROP.w);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#FFFFFF', fontFamily: 'Inter', color: INK }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 580, padding: '0 0 0 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 28 28">
              <rect x="1" y="1" width="26" height="26" rx="7" fill={ACCENT} />
              <path d="M7 10h14M7 15h14M7 20h9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <div style={{ display: 'flex', marginLeft: 18, fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>{BRAND_WORDMARK}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 40, fontSize: 58, fontWeight: 700, lineHeight: 1.06, letterSpacing: -1.8 }}>
            Fișe pe programă, de la grădiniță la clasa a IV-a
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontSize: 28, fontWeight: 500, color: MUTED }}>Codul competenței pe fișă. PDF gata de printat.</div>
          <div style={{ display: 'flex', marginTop: 30, alignSelf: 'flex-start', fontSize: 22, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
            Alfabetul românesc · Ă Â Î Ș Ț
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#F6F7FA', borderLeft: `1px solid ${LINE}` }}>
          <div style={{ display: 'flex', background: '#FFFFFF', border: `2px solid ${LINE}`, borderRadius: 16, padding: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={sheetStrip()} width={stripW} height={stripH} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: bold, weight: 700, style: 'normal' },
        { name: 'Inter', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
