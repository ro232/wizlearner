'use client';

import { useRef, useEffect, useCallback } from 'react';
import { WorksheetConfig } from '@/types';
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

interface WorksheetPreviewProps {
  config: WorksheetConfig;
  className?: string;
}

export function WorksheetPreview({ config, className }: WorksheetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBackgroundPattern = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, pattern: string, guideColor: string) => {
      const headerHeight = 59;
      const contentHeight = h - headerHeight;
      const contentTop = headerHeight;

      // Guide color map
      const guideColorMap: Record<string, string> = {
        gray: '#cbd5e1',
        green: '#86efac',
        orange: '#fdba74',
        purple: '#c4b5fd',
      };
      const gc = guideColorMap[guideColor] || '#cbd5e1';

      switch (pattern) {
        case 'blank': {
          // Just solid background, no pattern
          break;
        }

        case 'grid': {
          // Small grid pattern (5mm squares, roughly)
          const gridSize = 16;
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;

          for (let x = 0; x <= w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, contentTop);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          for (let y = contentTop; y <= h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          break;
        }

        case 'guides': {
          // Horizontal guide lines with adjustable spacing
          const lineSpacing = 35;
          ctx.strokeStyle = gc;
          ctx.lineWidth = 0.8;

          for (let y = contentTop + lineSpacing; y < h; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          break;
        }

        case 'patratele': {
          // Romanian math grid (squares with cross lines)
          const cellSize = 18;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.6;

          // Vertical lines
          for (let x = 0; x <= w; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, contentTop);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          // Horizontal lines
          for (let y = contentTop; y <= h; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Diagonal lines (lighter)
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.4;
          for (let i = 0; i < w + contentHeight; i += cellSize) {
            // \ diagonals
            ctx.beginPath();
            ctx.moveTo(i, contentTop);
            ctx.lineTo(i - contentHeight, h);
            ctx.stroke();

            // / diagonals
            ctx.beginPath();
            ctx.moveTo(i, contentTop);
            ctx.lineTo(i + contentHeight, h);
            ctx.stroke();
          }
          break;
        }

        case 'dictando': {
          // Romanian dictation lines (3 blue lines + red margin line on left)
          const lineHeight = 20;
          ctx.lineWidth = 1;

          // Left red margin
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(18, contentTop);
          ctx.lineTo(18, h);
          ctx.stroke();

          // Horizontal blue lines for writing
          ctx.strokeStyle = '#3b82f6';
          for (let y = contentTop + lineHeight; y < h; y += lineHeight) {
            ctx.beginPath();
            ctx.moveTo(25, y);
            ctx.lineTo(w - 15, y);
            ctx.stroke();
          }

          // Light spacing lines between (lighter blue)
          ctx.strokeStyle = '#bfdbfe';
          ctx.lineWidth = 0.5;
          for (let y = contentTop + lineHeight / 2; y < h; y += lineHeight) {
            ctx.beginPath();
            ctx.moveTo(25, y);
            ctx.lineTo(w - 15, y);
            ctx.stroke();
          }
          break;
        }

        case 'lines': {
          // Simple horizontal lines for writing (like notebook lines)
          const lineSpacing = 22;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.7;

          for (let y = contentTop + lineSpacing; y < h; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(15, y);
            ctx.lineTo(w - 15, y);
            ctx.stroke();
          }

          // Left margin line
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(15, contentTop);
          ctx.lineTo(15, h);
          ctx.stroke();
          break;
        }
      }
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const {
      selectedItems,
      fontStyle,
      tracingVisibility,
      backgroundPattern,
      showGuideLines,
      guideColor,
      showDirectionalArrows,
      showRewardSection,
      childName,
      letterSize,
      showLetterIcons,
      customTitle,
    } = config;

    // Clear & paper texture background
    ctx.fillStyle = '#FFFFFE';
    ctx.fillRect(0, 0, w, h);

    // Subtle paper noise texture
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.01})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }

    // Draw background pattern
    drawBackgroundPattern(ctx, w, h, backgroundPattern, guideColor);

    // Header with gradient
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(1, '#2E5C8A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 56);

    // Accent gradient line below header
    const ag = ctx.createLinearGradient(0, 0, w, 0);
    ag.addColorStop(0, '#E8913A');
    ag.addColorStop(1, '#F59E0B');
    ctx.fillStyle = ag;
    ctx.fillRect(0, 56, w, 3);

    // Header text: Child name or custom title
    ctx.fillStyle = '#fff';
    ctx.font = "bold 15px 'Inter', system-ui, sans-serif";
    ctx.textAlign = 'left';
    const headerTitle = childName ? `${childName}'s Worksheet` : customTitle || 'My Worksheet';
    ctx.fillText(headerTitle, 18, 26);

    // Date
    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    ctx.fillText(dateStr, 18, 44);

    // Brand text (top right)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = "bold 9px 'Inter', system-ui, sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText('WorksheetWiz', w - 18, 44);
    ctx.textAlign = 'left';

    // Empty state
    if (selectedItems.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = "14px 'Inter', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Pick items to see preview', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Layout calculations
    const sizes: Record<string, number> = { small: 45, medium: 60, large: 80 };
    const sz = sizes[letterSize] || 60;
    const showEm = showLetterIcons;
    const itemWidth = showEm ? sz + 30 : sz + 20;
    const cols = Math.max(1, Math.floor((w - 50) / itemWidth));
    const itemSpacing = itemWidth;
    const itemVerticalSpacing = sz + 30;

    // Draw each selected item
    selectedItems.forEach((letter, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 30 + col * itemSpacing;
      const y = 78 + row * itemVerticalSpacing;

      // Check if item would go off bottom
      if (y + sz > h - (showRewardSection ? 80 : 20)) return;

      // Draw guide lines for this letter if enabled
      if (showGuideLines) {
        const guideColorMap: Record<string, string> = {
          gray: '#cbd5e1',
          green: '#86efac',
          orange: '#fdba74',
          purple: '#c4b5fd',
        };
        const gc = guideColorMap[guideColor] || '#cbd5e1';

        ctx.strokeStyle = gc;
        ctx.lineWidth = 0.6;

        const lx = x - 3;
        const rx = x + sz + (showEm ? 20 : 3);

        // Top line
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.stroke();

        // Bottom line
        ctx.beginPath();
        ctx.moveTo(lx, y + sz);
        ctx.lineTo(rx, y + sz);
        ctx.stroke();

        // Middle dashed line (baseline helper)
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(lx, y + sz / 2);
        ctx.lineTo(rx, y + sz / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Extract letter (in case of paired letters like "Aa")
      const displayLetter = letter.length === 2 ? letter[0] : letter.toUpperCase();

      // Tracing visibility as opacity
      const alpha = tracingVisibility / 10;

      // Save canvas state for transformation
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sz / 80, sz / 80);

      // Get path for letter or number
      const path = LETTER_PATHS[displayLetter] || NUMBER_PATHS[displayLetter];

      if (path) {
        // Draw path-based letter
        ctx.strokeStyle = `rgba(30, 58, 95, ${alpha})`;
        ctx.lineWidth = fontStyle === 'outline' ? 2.5 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Set dash pattern based on font style
        if (fontStyle === 'dashed') {
          ctx.setLineDash([8, 6]);
        } else if (fontStyle === 'dotted') {
          ctx.setLineDash([2, 4]);
        } else {
          ctx.setLineDash([]);
        }

        // Parse and render SVG path commands
        const commands = path.split(/(?=[MLQ])/);
        ctx.beginPath();

        commands.forEach((cmd) => {
          const trimmed = cmd.trim();
          const numbers = trimmed
            .slice(1)
            .split(/[, ]+/)
            .map(Number);

          if (trimmed.startsWith('M')) {
            ctx.moveTo(numbers[0], numbers[1]);
          } else if (trimmed.startsWith('L')) {
            ctx.lineTo(numbers[0], numbers[1]);
          } else if (trimmed.startsWith('Q')) {
            ctx.quadraticCurveTo(numbers[0], numbers[1], numbers[2], numbers[3]);
          }
        });

        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Fallback: render as text with stroke
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;

        if (fontStyle === 'dashed') {
          ctx.setLineDash([6, 4]);
        } else if (fontStyle === 'dotted') {
          ctx.setLineDash([1.5, 3]);
        }

        ctx.font = `bold ${sz * 0.75}px 'Inter', system-ui, sans-serif`;
        ctx.strokeText(displayLetter, 5, sz * 0.75);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Restore canvas state
      ctx.restore();

      // Directional arrow indicator (number "1")
      if (showDirectionalArrows && path) {
        ctx.save();
        ctx.fillStyle = `rgba(232,145,58,${alpha})`;
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 7px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', x + 12, y + 12);
        ctx.restore();
      }

      // Emoji icon next to letter
      if (showEm && EMOJI_MAP[displayLetter]) {
        ctx.save();
        ctx.font = `${sz * 0.3}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(EMOJI_MAP[displayLetter], x + sz + 2, y + sz * 0.6);
        ctx.restore();
      }
    });

    // Reward section at bottom
    if (showRewardSection) {
      const ry = h - 68;
      const rw = w - 30;

      // Reward box background gradient
      const rg = ctx.createLinearGradient(15, ry, w - 15, ry);
      rg.addColorStop(0, '#FEF3C7');
      rg.addColorStop(1, '#FFFBEB');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.roundRect(15, ry, rw, 54, 10);
      ctx.fill();

      // Reward box border
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Reward title
      ctx.fillStyle = '#92400E';
      ctx.font = "bold 11px 'Inter', system-ui, sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText('Great job! You earned a sticker!', 28, ry + 24);

      // Reward subtitle
      ctx.font = "9px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = '#B45309';
      ctx.fillText('Collect 5 stickers for a reward!', 28, ry + 40);

      // Sticker boxes
      for (let i = 0; i < 5; i++) {
        const sx = w - 175 + i * 30;
        const sy = ry + 12;

        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.roundRect(sx, sy, 24, 24, 4);
        ctx.stroke();

        // Draw stars in first 2 boxes
        if (i < 2) {
          ctx.setLineDash([]);
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', sx + 12, sy + 12);
        }
      }
      ctx.setLineDash([]);
    }
  }, [config, drawBackgroundPattern]);

  // Redraw whenever config changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className={`relative group ${className || ''}`}>
      <div
        className="absolute -inset-2 rounded-2xl opacity-40 group-hover:opacity-70 transition-all duration-700"
        style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #fed7aa 50%, #ddd6fe 100%)',
          filter: 'blur(8px)',
        }}
      />
      <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5">
        <canvas
          ref={canvasRef}
          width={420}
          height={580}
          className="w-full h-auto"
          style={{ maxWidth: 420, background: '#fff' }}
        />
      </div>
    </div>
  );
}
