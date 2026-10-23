#!/usr/bin/env node
/**
 * Builds src/lib/hints/icons.json: the picture next to each hint word ("avion" ✈️),
 * as vector shapes the glyph engine can draw on screen and into the PDF.
 *
 * Source: Twemoji (https://github.com/jdecked/twemoji), graphics licensed CC-BY 4.0.
 * Attribution is printed on the book colophon and in the site footer.
 *
 * Run after changing LETTER_HINTS in src/lib/glyphs/data.ts or THEMES in src/lib/themes.ts:
 *   node scripts/build-hint-icons.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const svgpath = require('svgpath');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const twemojiDir = join(root, 'node_modules/@twemoji/svg');
// Every emoji used as a letter hint or as a picture in a theme.
const sources = ['src/lib/glyphs/data.ts', 'src/lib/themes.ts'].map((f) => readFileSync(join(root, f), 'utf8'));
const emojis = new Set(sources.flatMap((src) => [...src.matchAll(/emoji: '([^']+)'/g)].map((m) => m[1])));
// Pictures used by the activities (counting sheets): every quoted emoji in that file.
const activities = readFileSync(join(root, 'src/lib/worksheet/activities.ts'), 'utf8');
for (const m of activities.matchAll(/'(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)'/gu)) emojis.add(m[1]);

function fileFor(emoji) {
  const cps = [...emoji].map((c) => c.codePointAt(0).toString(16));
  const noFe0f = cps.filter((c) => c !== 'fe0f').join('-');
  for (const name of [noFe0f, cps.join('-')]) {
    const f = join(twemojiDir, `${name}.svg`);
    if (existsSync(f)) return f;
  }
  return null;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

function ellipseD(cx, cy, rx, ry) {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}

/** SVG element → path data, or null for elements we do not draw. */
function elementToD(tag) {
  const name = tag.match(/^<(\w+)/)[1];
  const n = (a) => parseFloat(attr(tag, a) ?? '0');
  switch (name) {
    case 'path':
      return attr(tag, 'd');
    case 'circle':
      return ellipseD(n('cx'), n('cy'), n('r'), n('r'));
    case 'ellipse':
      return ellipseD(n('cx'), n('cy'), n('rx'), n('ry'));
    case 'rect': {
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
    case 'polygon':
    case 'polyline': {
      const pts = (attr(tag, 'points') ?? '').trim().split(/[\s,]+/).map(Number);
      let d = '';
      for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i]} ${pts[i + 1]}`;
      return name === 'polygon' ? `${d}Z` : d;
    }
    default:
      return null;
  }
}

const r2 = (v) => Math.round(v * 100) / 100;

/** Normalise to absolute M / L / C / Z only, numbers rounded to 0.01 of the 36-unit box. */
function normalise(d, transform) {
  let p = svgpath(d);
  if (transform) p = p.transform(transform);
  p = p.abs().unarc().unshort();
  let out = '';
  let cur = [0, 0];
  let start = [0, 0];
  p.iterate((seg) => {
    const [cmd, ...a] = seg;
    switch (cmd) {
      case 'M': cur = [a[0], a[1]]; start = cur; out += `M${r2(a[0])} ${r2(a[1])}`; break;
      case 'L': cur = [a[0], a[1]]; out += `L${r2(a[0])} ${r2(a[1])}`; break;
      case 'H': cur = [a[0], cur[1]]; out += `L${r2(a[0])} ${r2(cur[1])}`; break;
      case 'V': cur = [cur[0], a[0]]; out += `L${r2(cur[0])} ${r2(a[0])}`; break;
      case 'C': cur = [a[4], a[5]]; out += `C${a.map(r2).join(' ')}`; break;
      case 'Q': {
        // quadratic → cubic
        const [qx, qy, x, y] = a;
        const c1 = [cur[0] + (2 / 3) * (qx - cur[0]), cur[1] + (2 / 3) * (qy - cur[1])];
        const c2 = [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)];
        out += `C${[...c1, ...c2, x, y].map(r2).join(' ')}`;
        cur = [x, y];
        break;
      }
      case 'Z': cur = start; out += 'Z'; break;
      default: throw new Error(`unsupported path command ${cmd}`);
    }
  });
  return out;
}

const icons = {};
const missing = [];
for (const emoji of emojis) {
  const file = fileFor(emoji);
  if (!file) { missing.push(emoji); continue; }
  const svg = readFileSync(file, 'utf8');
  if (/<(linearGradient|radialGradient|mask|clipPath|use)\b/.test(svg)) {
    throw new Error(`${emoji}: unsupported SVG feature in ${file}`);
  }
  // Group transforms are applied to their children; Twemoji nests at most one level.
  const shapes = [];
  const groupStack = [];
  for (const m of svg.matchAll(/<\/?[a-z][^>]*>/gi)) {
    const tag = m[0];
    if (/^<g\b/.test(tag)) { groupStack.push({ fill: attr(tag, 'fill'), transform: attr(tag, 'transform') }); continue; }
    if (/^<\/g>/.test(tag)) { groupStack.pop(); continue; }
    if (/^<\//.test(tag) || /^<svg\b/.test(tag)) continue;
    const d = elementToD(tag);
    if (!d) continue;
    const groupFill = [...groupStack].reverse().find((g) => g.fill)?.fill;
    const fill = attr(tag, 'fill') ?? groupFill ?? '#000000';
    if (fill === 'none') continue;
    const transforms = [...groupStack.map((g) => g.transform), attr(tag, 'transform')].filter(Boolean).join(' ');
    shapes.push({ f: fill.toUpperCase(), d: normalise(d, transforms || undefined), ...(attr(tag, 'fill-rule') === 'evenodd' ? { eo: 1 } : {}) });
  }
  icons[emoji] = shapes;
}

if (missing.length) {
  console.error(`No Twemoji picture for: ${missing.join(' ')}`);
  process.exit(1);
}

const outDir = join(root, 'src/lib/hints');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icons.json'), JSON.stringify({ size: 36, icons }) + '\n');
console.log(`Wrote ${Object.keys(icons).length} icons to src/lib/hints/icons.json`);
