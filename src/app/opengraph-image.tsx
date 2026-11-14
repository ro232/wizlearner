import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { flattenOps } from '@/lib/glyphs/geometry';
import { opToSvg } from '@/lib/glyphs/backends/svg';

/**
 * The picture shown when a link to the site is shared (WhatsApp, Facebook…): logo, one line of
 * text and a strip of a real sheet, drawn by the same engine as the PDFs. Built once, at build time.
 */
export const alt = 'WorksheetWiz – fișe de scris pentru grădiniță și clasa I';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1F2A44';
const PAPER = '#FBF7EE';
const PEN = '#C8102E';
const PENCIL = '#F2B632';

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
  const [display, text] = await Promise.all([
    readFile(join(process.cwd(), 'src/app/fonts/fraunces-extrabold-og.ttf')),
    readFile(join(process.cwd(), 'public/fonts/Nunito-Bold.ttf')),
  ]);
  const stripW = 500;
  const stripH = Math.round((stripW * CROP.h) / CROP.w);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: PAPER, border: `10px solid ${INK}`, fontFamily: 'Nunito', color: INK }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 520, padding: '0 0 0 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="76" height="76" viewBox="0 0 34 34">
              <g transform="rotate(35 17 17)">
                <rect x="13" y="1.5" width="8" height="22" rx="1.5" fill={PENCIL} stroke={INK} strokeWidth="2" />
                <rect x="13" y="1.5" width="8" height="5" fill={PEN} stroke={INK} strokeWidth="2" />
                <path d="M13 23.5 L17 32 L21 23.5 Z" fill="#F4D9B0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                <path d="M15.6 29 L17 32 L18.4 29 Z" fill={INK} />
              </g>
            </svg>
            <div style={{ display: 'flex', marginLeft: 14, fontFamily: 'Fraunces', fontSize: 54, letterSpacing: -1 }}>
              <span>Worksheet</span>
              <span style={{ color: PEN }}>Wiz</span>
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 34, fontFamily: 'Fraunces', fontSize: 58, lineHeight: 1.08, letterSpacing: -1.5 }}>
            Fișe de scris pentru grădiniță și clasa I
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontSize: 28, color: '#3F3B35' }}>Litere, cifre și numele copilului. PDF gata de printat.</div>
          <div style={{ display: 'flex', marginTop: 30, alignSelf: 'flex-start', fontSize: 21, color: PEN, borderBottom: `4px solid ${PEN}`, paddingBottom: 4, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>
            ALFABETUL ROMÂNESC · Ă Â Î Ș Ț
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', transform: 'rotate(3deg)', background: '#ffffff', border: `4px solid ${INK}`, boxShadow: `14px 14px 0 ${INK}`, padding: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={sheetStrip()} width={stripW} height={stripH} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: display, weight: 800, style: 'normal' },
        { name: 'Nunito', data: text, weight: 700, style: 'normal' },
      ],
    },
  );
}
