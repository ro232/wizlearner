/**
 * The plan as a Word file (.docx): landscape A4, the usual header (school, teacher, class, subject,
 * year, hours, the approvals to sign), the table with its header row repeated on every page, and
 * the note. Teachers edit and submit planificări in Word, so everything stays plain text in cells.
 *
 * Loaded only when someone downloads (see actions.ts): the `docx` package is not in any other page.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { planDocument, type DocCell, type PlanMeta } from './document';
import type { Plan } from './plan';

const FONT = 'Times New Roman';
/** A4 in twentieths of a point (portrait numbers: the library turns them for landscape) */
const A4 = { width: 11906, height: 16838 };
const MARGIN = 850; // 1.5 cm
const TABLE_W = A4.height - 2 * MARGIN;
const SIZE = 20; // half-points: 10 pt in the table
const HEAD_FILL = 'E8EDF5';
const MODULE_FILL = 'F3F5F9';

const border = { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' };
const borders = { top: border, bottom: border, left: border, right: border };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, bold: o.bold, size: o.size ?? SIZE, font: FONT, color: o.color });

function cell(c: DocCell, width: number, opts: { fill?: string; bold?: boolean; span?: number } = {}): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.span,
    borders,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    children: (c.lines.length ? c.lines : ['']).map(
      (l) =>
        new Paragraph({
          alignment: c.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 20 },
          children: [run(l, { bold: opts.bold || c.bold })],
        }),
    ),
  });
}

export function buildPlanDocx(plan: Plan, meta: PlanMeta = {}): Document {
  const doc = planDocument(plan, meta);
  const share = doc.columns.reduce((s, c) => s + c.width, 0);
  const widths = doc.columns.map((c) => Math.round((c.width / share) * TABLE_W));
  widths[widths.length - 1] += TABLE_W - widths.reduce((s, w) => s + w, 0);
  const span = doc.columns.length;

  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: doc.columns.map((c, i) => cell({ lines: [c.title], align: 'center' }, widths[i], { fill: HEAD_FILL, bold: true })),
  });
  const band = (text: string, fill: string, bold: boolean) =>
    new TableRow({ cantSplit: true, children: [cell({ lines: [text] }, TABLE_W, { fill, bold, span })] });

  const rows: TableRow[] = [header];
  for (const s of doc.sections) {
    rows.push(band(s.title, MODULE_FILL, true));
    for (const r of s.rows) rows.push(new TableRow({ children: r.map((c, i) => cell({ ...c, align: c.align ?? doc.columns[i].align }, widths[i])) }));
    if (s.after) rows.push(band(s.after, 'FFFFFF', false));
  }

  // header block: the fields on the left, the approvals on the right (a table without borders)
  const fieldPara = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [run(`${label}: `, { bold: true, size: 22 }), run(value || '……………………………………………', { size: 22 })],
    });
  const left = Math.round(TABLE_W * 0.56);
  const headBlock = new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: [left, TABLE_W - left],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: left, type: WidthType.DXA }, borders: noBorders, children: doc.fields.map((f) => fieldPara(f.label, f.value)) }),
          new TableCell({
            width: { size: TABLE_W - left, type: WidthType.DXA },
            borders: noBorders,
            children: doc.approvals.flatMap((a) => [fieldPara(a, ''), new Paragraph({ spacing: { after: 120 }, children: [] })]),
          }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [
    headBlock,
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [run(doc.title, { bold: true, size: 30 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [run(`${doc.fields.find((f) => f.label === 'Disciplina')?.value} · clasa ${doc.fields.find((f) => f.label === 'Clasa')?.value} · an școlar ${doc.fields.find((f) => f.label === 'An școlar')?.value}`, { size: 22, color: '475569' })],
    }),
  ];
  if (doc.partial) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run(doc.partial, { bold: true, color: 'B45309' })] }));
  children.push(new Table({ width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows }));
  for (const n of doc.note) children.push(new Paragraph({ spacing: { before: 120 }, children: [run(n, { size: 18, color: '475569' })] }));

  return new Document({
    creator: 'WorksheetWiz',
    title: `${doc.title} – ${doc.fields.find((f) => f.label === 'Disciplina')?.value}`,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height, orientation: PageOrientation.LANDSCAPE },
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  run(`${doc.footer} · Pagina `, { size: 16, color: '475569' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: '475569' }),
                  run(' din ', { size: 16, color: '475569' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: '475569' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

/** The .docx file as bytes (Node, tests). */
export async function planDocxBuffer(plan: Plan, meta: PlanMeta = {}): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toArrayBuffer(buildPlanDocx(plan, meta)));
}

/** Download the .docx in the browser. */
export async function downloadPlanDocx(plan: Plan, meta: PlanMeta, filename: string): Promise<void> {
  const blob = await Packer.toBlob(buildPlanDocx(plan, meta));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
