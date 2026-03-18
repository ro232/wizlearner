import { jsPDF } from 'jspdf';
import { WorksheetConfig, Tier } from '@/types';
import { EMOJI_MAP } from '@/lib/constants';

// SVG path data for traceable letter outlines
const LETTER_PATHS: Record<string, string> = {
  A: "M10,80 L40,10 L70,80 M22,55 L58,55",
  B: "M15,10 L15,80 M15,10 L50,10 Q70,10 70,25 Q70,42 50,42 L15,42 M15,42 L55,42 Q75,42 75,60 Q75,80 55,80 L15,80",
  C: "M65,20 Q40,5 25,20 Q10,35 10,50 Q10,65 25,75 Q40,90 65,75",
  D: "M15,10 L15,80 M15,10 L45,10 Q70,10 70,45 Q70,80 45,80 L15,80",
  E: "M60,10 L15,10 L15,80 L60,80 M15,45 L50,45",
  F: "M60,10 L15,10 L15,80 M15,45 L50,45",
  G: "M65,20 Q40,5 25,20 Q10,35 10,50 Q10,65 25,75 Q40,90 65,75 L65,50 L45,50",
  H: "M15,10 L15,80 M65,10 L65,80 M15,45 L65,45",
  I: "M25,10 L55,10 M40,10 L40,80 M25,80 L55,80",
  J: "M20,10 L60,10 M45,10 L45,65 Q45,80 30,80 Q15,80 15,65",
  K: "M15,10 L15,80 M60,10 L15,45 L60,80",
  L: "M15,10 L15,80 L60,80",
  M: "M10,80 L10,10 L40,55 L70,10 L70,80",
  N: "M15,80 L15,10 L65,80 L65,10",
  O: "M40,10 Q10,10 10,45 Q10,80 40,80 Q70,80 70,45 Q70,10 40,10",
  P: "M15,80 L15,10 L50,10 Q70,10 70,28 Q70,45 50,45 L15,45",
  Q: "M40,10 Q10,10 10,45 Q10,80 40,80 Q70,80 70,45 Q70,10 40,10 M55,65 L70,80",
  R: "M15,80 L15,10 L50,10 Q70,10 70,28 Q70,45 50,45 L15,45 M45,45 L70,80",
  S: "M60,20 Q60,10 40,10 Q20,10 15,20 Q10,30 20,38 Q30,45 50,50 Q65,55 65,65 Q65,80 40,80 Q20,80 15,70",
  T: "M10,10 L70,10 M40,10 L40,80",
  U: "M15,10 L15,65 Q15,80 40,80 Q65,80 65,65 L65,10",
  V: "M10,10 L40,80 L70,10",
  W: "M5,10 L20,80 L40,40 L60,80 L75,10",
  X: "M15,10 L65,80 M65,10 L15,80",
  Y: "M10,10 L40,45 L70,10 M40,45 L40,80",
  Z: "M15,10 L65,10 L15,80 L65,80",
  a: "M50,30 Q50,20 40,20 Q20,20 20,35 Q20,50 40,50 Q60,50 60,45 L60,80 M20,35 Q20,25 40,25 Q50,25 50,30",
  b: "M15,10 L15,80 M15,40 Q15,20 35,20 Q55,20 60,35 Q65,50 60,65 Q55,80 35,80 Q15,80 15,65",
  c: "M60,25 Q50,20 35,20 Q20,20 15,35 Q10,50 15,65 Q20,80 35,80 Q50,80 60,75",
  d: "M65,10 L65,80 M65,40 Q65,20 45,20 Q25,20 20,35 Q15,50 20,65 Q25,80 45,80 Q65,80 65,65",
  e: "M15,45 L60,45 Q65,45 65,35 Q65,20 45,20 Q25,20 15,35 Q10,50 15,65 Q20,80 40,80 Q55,80 60,75",
  f: "M50,10 Q40,10 35,20 L35,80 M15,30 L55,30",
  g: "M65,20 Q65,20 65,75 Q65,90 45,95 Q25,100 15,90 L20,85 Q35,95 45,95 Q60,95 65,80 M45,20 Q25,20 20,35 Q15,50 20,65 Q25,80 45,80 Q65,80 65,65",
  h: "M15,10 L15,80 M15,35 Q15,20 35,20 Q55,20 60,35 L60,80",
  i: "M25,15 L35,15 M25,25 L35,80",
  j: "M35,15 L45,15 M40,25 L40,75 Q40,85 30,85 Q20,85 15,80",
  k: "M15,10 L15,80 M55,25 L15,50 L55,80",
  l: "M25,10 L25,80",
  m: "M15,25 L15,80 M15,35 Q15,20 30,20 Q45,20 50,35 L50,80 M50,35 Q50,20 65,20 Q80,20 85,35 L85,80",
  n: "M15,25 L15,80 M15,35 Q15,20 35,20 Q55,20 60,35 L60,80",
  o: "M40,20 Q20,20 15,35 Q10,50 15,65 Q20,80 40,80 Q60,80 65,65 Q70,50 65,35 Q60,20 40,20",
  p: "M15,20 L15,95 M15,40 Q15,20 35,20 Q55,20 60,35 Q65,50 60,65 Q55,80 35,80 Q15,80 15,65",
  q: "M65,20 L65,95 M65,40 Q65,20 45,20 Q25,20 20,35 Q15,50 20,65 Q25,80 45,80 Q65,80 65,65",
  r: "M15,25 L15,80 M15,35 Q15,20 35,20 Q50,20 60,25",
  s: "M55,25 Q55,20 40,20 Q25,20 20,28 Q18,35 28,40 Q40,45 45,50 Q55,55 55,65 Q55,80 35,80 Q20,80 15,75",
  t: "M40,10 L40,75 Q40,85 50,85 L55,85 M20,25 L60,25",
  u: "M15,25 L15,65 Q15,80 35,80 Q55,80 60,65 L60,25 L60,80",
  v: "M10,25 L35,80 L60,25",
  w: "M5,25 L15,80 L35,40 L55,80 L65,25",
  x: "M15,25 L55,80 M55,25 L15,80",
  y: "M10,25 L35,80 Q50,90 60,80 L60,25 M35,80 L25,100",
  z: "M15,25 L55,25 L15,80 L55,80",
};

// Number paths (1-9, 0)
const NUMBER_PATHS: Record<string, string> = {
  "1": "M25,20 L40,10 L40,80 M25,80 L55,80",
  "2": "M15,25 Q15,10 40,10 Q65,10 65,25 Q65,40 40,55 L15,80 L65,80",
  "3": "M15,15 Q40,5 60,20 Q70,30 55,42 Q40,45 55,55 Q70,65 55,78 Q40,85 15,75",
  "4": "M50,80 L50,10 L10,55 L65,55",
  "5": "M60,10 L20,10 L15,42 Q30,35 50,40 Q70,48 70,60 Q70,80 45,80 Q20,80 15,70",
  "6": "M55,15 Q30,5 20,25 Q10,40 10,55 Q10,80 35,80 Q60,80 65,65 Q70,50 65,40 Q60,35 40,35 Q20,35 20,55",
  "7": "M65,10 L15,80 M65,10 L15,10",
  "8": "M40,10 Q15,10 15,30 Q15,45 40,50 Q65,55 65,70 Q65,80 40,80 Q15,80 15,65 Q15,50 40,45 Q65,40 65,30 Q65,10 40,10",
  "9": "M20,80 Q45,90 55,70 Q65,55 65,40 Q65,15 40,15 Q15,15 10,30 Q5,45 10,55 L55,55",
  "0": "M40,10 Q10,10 10,45 Q10,80 40,80 Q70,80 70,45 Q70,10 40,10",
};

// Page size definitions in mm (width, height)
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  b5: { width: 176, height: 250 },
};

// Guide color map
const GUIDE_COLOR_MAP: Record<string, string> = {
  gray: '#cbd5e1',
  green: '#86efac',
  orange: '#fdba74',
  purple: '#c4b5fd',
};

interface PathCommand {
  cmd: string;
  x?: number;
  y?: number;
  cp1x?: number;
  cp1y?: number;
  cp2x?: number;
  cp2y?: number;
}

function parseSVGPath(pathData: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const pathRegex = /([MLQHVCSATZ])([^MLQHVCSATZ]*)/gi;
  let match;

  while ((match = pathRegex.exec(pathData)) !== null) {
    const cmd = match[1].toUpperCase();
    const coordsStr = match[2].trim();
    const coords = coordsStr.match(/-?\d+\.?\d*/g) || [];
    const numbers = coords.map(Number);

    if (cmd === 'M' && numbers.length >= 2) {
      commands.push({ cmd: 'M', x: numbers[0], y: numbers[1] });
    } else if (cmd === 'L' && numbers.length >= 2) {
      commands.push({ cmd: 'L', x: numbers[0], y: numbers[1] });
    } else if (cmd === 'Q' && numbers.length >= 4) {
      commands.push({
        cmd: 'Q',
        cp1x: numbers[0],
        cp1y: numbers[1],
        x: numbers[2],
        y: numbers[3],
      });
    } else if (cmd === 'Z') {
      commands.push({ cmd: 'Z' });
    }
  }

  return commands;
}

function drawSVGPath(
  doc: jsPDF,
  pathData: string,
  x: number,
  y: number,
  scale: number,
  lineWidth: number,
  lineDash: 'solid' | 'dashed' | 'dotted' | 'cursive',
  color: string
) {
  const commands = parseSVGPath(pathData);
  if (commands.length === 0) return;

  doc.setDrawColor(color);
  doc.setLineWidth(lineWidth);

  if (lineDash === 'dashed') {
    doc.setLineDashPattern([3, 2], 0);
  } else if (lineDash === 'dotted') {
    doc.setLineDashPattern([1, 1], 0);
  } else {
    doc.setLineDashPattern([], 0);
  }

  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    if (cmd.cmd === 'M') {
      currentX = cmd.x!;
      currentY = cmd.y!;
    } else if (cmd.cmd === 'L') {
      const startX = x + (currentX * scale) / 80;
      const startY = y + (currentY * scale) / 80;
      const endX = x + (cmd.x! * scale) / 80;
      const endY = y + (cmd.y! * scale) / 80;
      doc.line(startX, startY, endX, endY);
      currentX = cmd.x!;
      currentY = cmd.y!;
    } else if (cmd.cmd === 'Q') {
      // Approximation: draw multiple line segments for quadratic Bezier
      const cp1x = cmd.cp1x!;
      const cp1y = cmd.cp1y!;
      const x2 = cmd.x!;
      const y2 = cmd.y!;

      const points = [];
      for (let t = 0; t <= 1; t += 0.1) {
        const mt = 1 - t;
        const px = mt * mt * currentX + 2 * mt * t * cp1x + t * t * x2;
        const py = mt * mt * currentY + 2 * mt * t * cp1y + t * t * y2;
        const docX = x + (px * scale) / 80;
        const docY = y + (py * scale) / 80;
        points.push([docX, docY]);
      }

      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
      }

      currentX = x2;
      currentY = y2;
    }
  }

  doc.setLineDashPattern([], 0);
}

function getLetterPaths(
  config: WorksheetConfig
): Record<string, string> {
  if (config.category === 'letters') {
    if (config.letterMode === 'uppercase') {
      const paths: Record<string, string> = {};
      config.selectedItems.forEach((letter) => {
        if (LETTER_PATHS[letter]) paths[letter] = LETTER_PATHS[letter];
      });
      return paths;
    } else if (config.letterMode === 'lowercase') {
      const paths: Record<string, string> = {};
      config.selectedItems.forEach((letter) => {
        if (LETTER_PATHS[letter.toLowerCase()]) {
          paths[letter] = LETTER_PATHS[letter.toLowerCase()];
        }
      });
      return paths;
    } else if (config.letterMode === 'paired') {
      const paths: Record<string, string> = {};
      config.selectedItems.forEach((pair) => {
        const upper = pair[0].toUpperCase();
        const lower = pair[0].toLowerCase();
        if (LETTER_PATHS[upper]) paths[upper] = LETTER_PATHS[upper];
        if (LETTER_PATHS[lower]) paths[lower] = LETTER_PATHS[lower];
      });
      return paths;
    }
  } else if (config.category === 'numbers') {
    const paths: Record<string, string> = {};
    config.selectedItems.forEach((num) => {
      if (NUMBER_PATHS[num]) paths[num] = NUMBER_PATHS[num];
    });
    return paths;
  }

  return {};
}

function drawBackgroundPattern(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  pattern: string,
  guideColor: string
) {
  const gc = GUIDE_COLOR_MAP[guideColor] || '#cbd5e1';

  switch (pattern) {
    case 'blank':
      break;

    case 'grid': {
      const gridSize = 5; // mm
      doc.setDrawColor('#e2e8f0');
      doc.setLineWidth(0.1);

      for (let px = x; px <= x + width; px += gridSize) {
        doc.line(px, y, px, y + height);
      }

      for (let py = y; py <= y + height; py += gridSize) {
        doc.line(x, py, x + width, py);
      }
      break;
    }

    case 'guides': {
      const lineSpacing = 8.5; // mm
      doc.setDrawColor(gc);
      doc.setLineWidth(0.2);

      for (let py = y + lineSpacing; py < y + height; py += lineSpacing) {
        doc.line(x, py, x + width, py);
      }
      break;
    }

    case 'patratele': {
      const cellSize = 5; // mm
      doc.setDrawColor('#cbd5e1');
      doc.setLineWidth(0.15);

      for (let px = x; px <= x + width; px += cellSize) {
        doc.line(px, y, px, y + height);
      }

      for (let py = y; py <= y + height; py += cellSize) {
        doc.line(x, py, x + width, py);
      }

      doc.setDrawColor('#e2e8f0');
      doc.setLineWidth(0.08);
      for (let i = 0; i < (width + height) / cellSize; i += 1) {
        const offset = i * cellSize;
        doc.line(x + offset, y, x + offset - height, y + height);
        doc.line(x + offset, y, x + offset + height, y + height);
      }
      break;
    }

    case 'dictando': {
      const lineHeight = 5; // mm
      doc.setLineWidth(0.25);

      // Left red margin
      doc.setDrawColor('#ef4444');
      doc.line(x + 4, y, x + 4, y + height);

      // Horizontal blue lines
      doc.setDrawColor('#3b82f6');
      for (let py = y + lineHeight; py < y + height; py += lineHeight) {
        doc.line(x + 6, py, x + width, py);
      }

      // Light spacing lines
      doc.setDrawColor('#bfdbfe');
      doc.setLineWidth(0.1);
      for (let py = y + lineHeight / 2; py < y + height; py += lineHeight) {
        doc.line(x + 6, py, x + width, py);
      }
      break;
    }

    case 'lines': {
      const lineSpacing = 5.5; // mm
      doc.setDrawColor('#cbd5e1');
      doc.setLineWidth(0.15);

      for (let py = y + lineSpacing; py < y + height; py += lineSpacing) {
        doc.line(x + 3, py, x + width - 3, py);
      }
      break;
    }
  }
}

function calculateLetterSize(
  letterSizeConfig: string
): { width: number; height: number } {
  switch (letterSizeConfig) {
    case 'small':
      return { width: 12, height: 18 };
    case 'large':
      return { width: 20, height: 30 };
    case 'medium':
    default:
      return { width: 16, height: 24 };
  }
}

function calculateLineSpacing(rowSpacing: string): number {
  switch (rowSpacing) {
    case 'tight':
      return 8;
    case 'wide':
      return 12;
    case 'normal':
    default:
      return 10;
  }
}

export function generateWorksheetPDF(
  config: WorksheetConfig,
  tier: Tier
): void {
  const pageSize = PAGE_SIZES[config.pageSize] || PAGE_SIZES.a4;
  const isLandscape = config.orientation === 'landscape';
  const [width, height] = isLandscape
    ? [pageSize.height, pageSize.width]
    : [pageSize.width, pageSize.height];

  const doc = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: config.pageSize === 'a4' ? 'a4' : config.pageSize === 'letter' ? 'letter' : [width, height],
  });

  const margin = 10; // mm
  const contentX = margin;
  const contentY = margin + 15; // Space for header
  const contentWidth = width - margin * 2;
  const contentHeight = height - margin * 2 - 15;

  const letterSize = calculateLetterSize(config.letterSize);
  const lineSpacing = calculateLineSpacing(config.rowSpacing);
  const itemsPerRow = Math.floor((contentWidth - 10) / (letterSize.width + 10));
  const itemsPerPage = config.rowsPerPage * itemsPerRow;

  const letterPaths = getLetterPaths(config);
  const itemsToRender = Object.keys(letterPaths);

  const totalPages = Math.ceil(itemsToRender.length / itemsPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      doc.addPage();
    }

    // Draw header
    doc.setFontSize(10);
    doc.setTextColor('#0F172A');
    let headerY = margin + 3;

    if (config.childName) {
      doc.text(`Name: ${config.childName}`, margin, headerY);
      headerY += 4;
    }

    if (config.dateField) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      doc.text(`Date: ${dateStr}`, margin, headerY);
      headerY += 4;
    }

    if (config.customTitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(config.customTitle, margin, headerY);
      doc.setFont('helvetica', 'normal');
      headerY += 5;
    }

    // WorksheetWiz branding
    doc.setFontSize(8);
    doc.setTextColor('#64748B');
    doc.text('WorksheetWiz', width - margin - 30, margin + 3);

    // Draw background pattern
    drawBackgroundPattern(
      doc,
      contentX,
      contentY,
      contentWidth,
      contentHeight,
      config.backgroundPattern,
      config.guideColor
    );

    // Draw guide lines if enabled
    if (config.showGuideLines) {
      const guideLineColor = GUIDE_COLOR_MAP[config.guideColor] || '#cbd5e1';
      doc.setDrawColor(guideLineColor);
      doc.setLineWidth(0.15);

      const lineSpacingMm = 8.5;
      for (let y = contentY + lineSpacingMm; y < contentY + contentHeight; y += lineSpacingMm) {
        doc.line(contentX, y, contentX + contentWidth, y);
      }
    }

    // Render letters/numbers
    const startIdx = pageNum * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, itemsToRender.length);

    let itemIdx = 0;
    for (let row = 0; row < config.rowsPerPage; row++) {
      const currentY = contentY + row * (letterSize.height + lineSpacing) + 5;

      if (currentY + letterSize.height > contentY + contentHeight) break;

      for (let col = 0; col < itemsPerRow; col++) {
        const globalIdx = startIdx + itemIdx;
        if (globalIdx >= endIdx) break;

        const item = itemsToRender[globalIdx];
        const currentX = contentX + col * (letterSize.width + 10) + 5;

        if (currentX + letterSize.width > contentX + contentWidth) break;

        // Draw letter
        const pathData = letterPaths[item];
        if (pathData) {
          drawSVGPath(
            doc,
            pathData,
            currentX,
            currentY,
            letterSize.height,
            0.3,
            config.fontStyle as 'solid' | 'dashed' | 'dotted' | 'cursive',
            '#2E5C8A'
          );
        }

        // Draw emoji if enabled
        if (config.showLetterIcons) {
          const emoji = EMOJI_MAP[item];
          if (emoji) {
            doc.setFontSize(10);
            doc.text(emoji, currentX + letterSize.width + 2, currentY + letterSize.height / 2);
          }
        }

        // Draw directional arrow if enabled
        if (config.showDirectionalArrows && config.fontStyle === 'dashed') {
          doc.setDrawColor('#E8913A');
          doc.setLineWidth(0.2);
          // Simple arrow pointing right
          const arrowX = currentX - 3;
          const arrowY = currentY + letterSize.height / 2;
          doc.line(arrowX, arrowY, arrowX + 2, arrowY);
          doc.line(arrowX + 2, arrowY, arrowX + 1.5, arrowY - 1);
          doc.line(arrowX + 2, arrowY, arrowX + 1.5, arrowY + 1);
        }

        itemIdx++;
      }
    }

    // Draw reward section at bottom if enabled
    if (config.showRewardSection) {
      const rewardY = contentY + contentHeight + 5;
      doc.setDrawColor('#2D8B5C');
      doc.setLineWidth(0.5);
      doc.rect(contentX, rewardY, contentWidth, 8);
      doc.setFontSize(8);
      doc.setTextColor('#2D8B5C');
      doc.text('⭐ Great job!', contentX + 2, rewardY + 5);
    }

    // Page numbers for multi-page PDFs
    if (totalPages > 1) {
      doc.setFontSize(8);
      doc.setTextColor('#64748B');
      doc.text(
        `Page ${pageNum + 1} of ${totalPages}`,
        width / 2 - 10,
        height - 5
      );
    }

    // Watermark for free tier
    if (tier === 'free') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor('#cbd5e1');
      doc.text(
        'Made with WorksheetWiz.com',
        width - margin - 35,
        height - margin - 2
      );
    }
  }

  // Auto-download
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const childNamePart = config.childName ? `-${config.childName.replace(/\s+/g, '-')}` : '';
  const filename = `WorksheetWiz${childNamePart}-${dateStr}.pdf`;

  doc.save(filename);
}
