This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Tracing glyph engine (`src/lib/glyphs`)

Letters, digits and shapes are **vector strokes**, not fonts. Each glyph in
`data.ts` lists its strokes in the order a child is taught to write them
(cap height = 100 units, x-height = 50, baseline = 100, descender = 135):

```
A: ['M 40 0 L 0 100', 'M 40 0 L 80 100', 'M 14 65 L 66 65']
Ă: A + 'A 40 -30 16 10 200 -20'   // breve drawn last
```

- `geometry.ts` – stroke DSL (`M L C A l`), arcs → cubic béziers, lengths, bounding boxes
- `render.ts` – one glyph → draw-ops: solid / dashed / dotted / outline strokes,
  **numbered start dots** and **direction arrows**
- `backends/` – the same draw-ops rendered to **canvas** (live preview), **jsPDF**
  (download) and **SVG**
- `src/lib/worksheet/layout.ts` – rows (model letter + fading copies), guides,
  header, reward box → identical pages for preview and PDF

The Romanian alphabet (`ALPHABETS.ro`) includes Ă Â Î Ș Ț in upper and lower
case; `ş`/`ţ` (cedilla) input is normalised to the comma-below letters.
Header text is set in Nunito (`public/fonts`, SIL OFL), embedded in the PDF so
diacritics print correctly.

## KDP book mode (`src/lib/book`, page `/book`)

Composes a complete print-ready workbook for Amazon KDP from the same glyph
engine: title page, colophon, parent instructions, pre-writing section (9
patterns from `src/lib/glyphs/patterns.ts`), one page per letter, alphabet
review, one page per number (with counting stars), numbers review, certificate.

- `spec.ts` – KDP geometry: trim sizes, bleed (0.125 in), gutter by page count,
  spine width per paper type, full-wrap cover size
- `interior.ts` – page builders with mirrored margins (gutter on the inside),
  even page count, optional preview watermark
- `cover.ts` – back cover + spine + front cover in one page, barcode corner left clear
- `src/lib/pdf/generate-book.ts` – interior and cover PDFs (Nunito embedded)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
