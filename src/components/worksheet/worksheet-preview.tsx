'use client';

import { useRef, useEffect, useCallback } from 'react';
import { WorksheetConfig } from '@/types';
import { EMOJI_MAP } from '@/lib/constants';

// SVG path data for traceable letter outlines (within 80x80 coordinate space)
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const {
      selectedItems, fontStyle, tracingVisibility, backgroundPattern,
      showGuideLines, guideColor, showDirectionalArrows, showRewardSection,
      childName, letterSize, showLetterIcons, customTitle, rowsPerPage,
    } = config;

    // Clear canvas
    ctx.fillStyle = '#FFFFFE';
    ctx.fillRect(0, 0, w, h);

    // Subtle paper texture
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.008})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }

    // ─── HEADER ───
    const headerH = 52;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#1e3a5f'); grad.addColorStop(1, '#2E5C8A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, headerH);

    // Accent line
    const ag = ctx.createLinearGradient(0, 0, w, 0);
    ag.addColorStop(0, '#E8913A'); ag.addColorStop(1, '#F59E0B');
    ctx.fillStyle = ag;
    ctx.fillRect(0, headerH, w, 2.5);

    // Header text
    ctx.fillStyle = '#fff';
    ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(childName ? `${childName}'s Worksheet` : customTitle || 'My Worksheet', 14, 22);
    ctx.font = "10px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 14, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = "bold 8px 'Inter', system-ui, sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText('WorksheetWiz', w - 14, 40);
    ctx.textAlign = 'left';

    // ─── BACKGROUND PATTERN ───
    const contentTop = headerH + 3;
    const guideColorMap: Record<string, string> = { gray: '#cbd5e1', green: '#86efac', orange: '#fdba74', purple: '#c4b5fd' };
    const gc = guideColorMap[guideColor] || '#cbd5e1';

    if (backgroundPattern === 'grid' || backgroundPattern === 'patratele') {
      const sz = backgroundPattern === 'patratele' ? 16 : 18;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.4;
      for (let x = 0; x < w; x += sz) { ctx.beginPath(); ctx.moveTo(x, contentTop); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = contentTop; y < h; y += sz) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    } else if (backgroundPattern === 'dictando') {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(16, contentTop); ctx.lineTo(16, h); ctx.stroke();
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.6;
      for (let y = contentTop + 18; y < h; y += 18) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(w - 10, y); ctx.stroke(); }
    } else if (backgroundPattern === 'lines') {
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.5;
      for (let y = contentTop + 20; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke(); }
    } else if (backgroundPattern === 'guides') {
      ctx.strokeStyle = gc; ctx.lineWidth = 0.6;
      for (let y = contentTop + 30; y < h - 20; y += 60) {
        ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke();
        ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(12, y + 20); ctx.lineTo(w - 12, y + 20); ctx.stroke();
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(12, y + 40); ctx.lineTo(w - 12, y + 40); ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // ─── EMPTY STATE ───
    if (selectedItems.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = "14px 'Inter', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Pick items to see preview', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // ─── LAYOUT CALCULATION ───
    const letterSizes: Record<string, number> = { small: 32, medium: 48, large: 72 };
    const sz = letterSizes[letterSize] || 48;
    const reps = config.repetitionsPerItem || 1;

    const marginX = 16;
    const marginTop = contentTop + 12;
    const rewardHeight = showRewardSection ? 60 : 10;
    const usableWidth = w - marginX * 2;
    const usableHeight = h - marginTop - rewardHeight;

    const cellPadding = 8;
    const emojiExtra = showLetterIcons ? 16 : 0;
    const cellWidth = sz + cellPadding + emojiExtra;
    const cols = Math.max(1, Math.floor(usableWidth / cellWidth));

    const rowHeight = sz + 10;
    const maxVisibleRows = Math.min(rowsPerPage, Math.floor(usableHeight / rowHeight));

    // Build expanded list: each item repeated `reps` times
    // Each entry knows which rep it is (0 = model row, 1+ = practice rows)
    const expandedItems: Array<{ letter: string; rep: number }> = [];
    for (const item of selectedItems) {
      for (let r = 0; r < reps; r++) {
        expandedItems.push({ letter: item, rep: r });
      }
    }

    const itemsPerPage = cols * maxVisibleRows;
    const expandedToShow = expandedItems.slice(0, itemsPerPage);
    const totalPages = Math.max(1, Math.ceil(expandedItems.length / itemsPerPage));

    const totalGridWidth = cols * cellWidth;
    const offsetX = marginX + (usableWidth - totalGridWidth) / 2;

    // ─── DRAW ITEMS ───
    expandedToShow.forEach((entry, i) => {
      const letter = entry.letter;
      const isRepeatRow = entry.rep > 0;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = offsetX + col * cellWidth;
      const y = marginTop + row * rowHeight;

      if (y + sz > h - rewardHeight) return;

      // Guide lines per letter
      if (showGuideLines) {
        ctx.strokeStyle = gc; ctx.lineWidth = 0.5;
        const lx = x - 2, rx = x + sz + emojiExtra + 2;
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx, y + sz); ctx.lineTo(rx, y + sz); ctx.stroke();
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(lx, y + sz / 2); ctx.lineTo(rx, y + sz / 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Extract display letter
      const displayLetter = letter.length === 2 ? letter[0] : letter.toUpperCase();
      // Model row uses full visibility, repeat rows use reduced visibility for practice
      const baseAlpha = tracingVisibility / 10;
      const alpha = isRepeatRow ? baseAlpha * 0.5 : baseAlpha;

      // Draw letter
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sz / 80, sz / 80);

      const path = LETTER_PATHS[displayLetter] || NUMBER_PATHS[displayLetter];
      if (path) {
        ctx.strokeStyle = `rgba(30, 58, 95, ${alpha})`;
        ctx.lineWidth = fontStyle === 'outline' ? 2.5 : 3;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (fontStyle === 'dashed') ctx.setLineDash([8, 6]);
        else if (fontStyle === 'dotted') ctx.setLineDash([2, 4]);
        else ctx.setLineDash([]);

        const commands = path.split(/(?=[MLQ])/);
        ctx.beginPath();
        commands.forEach((cmd) => {
          const t = cmd.trim();
          const nums = t.slice(1).split(/[, ]+/).map(Number);
          if (t.startsWith('M')) ctx.moveTo(nums[0], nums[1]);
          else if (t.startsWith('L')) ctx.lineTo(nums[0], nums[1]);
          else if (t.startsWith('Q')) ctx.quadraticCurveTo(nums[0], nums[1], nums[2], nums[3]);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;
        if (fontStyle === 'dashed') ctx.setLineDash([6, 4]);
        else if (fontStyle === 'dotted') ctx.setLineDash([1.5, 3]);
        ctx.font = `bold ${64}px 'Inter', system-ui, sans-serif`;
        ctx.strokeText(displayLetter, 5, 68);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Directional arrow
      if (showDirectionalArrows && path) {
        ctx.save();
        ctx.fillStyle = `rgba(232,145,58,${alpha})`;
        ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 6px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('1', x + 8, y + 8);
        ctx.restore();
      }

      // Emoji
      if (showLetterIcons && EMOJI_MAP[displayLetter]) {
        ctx.save();
        ctx.font = `${sz * 0.35}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(EMOJI_MAP[displayLetter], x + sz + 2, y + sz * 0.65);
        ctx.restore();
      }
    });

    // ─── PAGE INDICATOR ───
    if (totalPages > 1) {
      const remainingItems = expandedItems.length - expandedToShow.length;
      ctx.save();
      ctx.fillStyle = 'rgba(30, 58, 95, 0.1)';
      ctx.beginPath(); ctx.roundRect(w / 2 - 90, h - rewardHeight - 30, 180, 24, 12); ctx.fill();
      ctx.font = "bold 10px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = '#475569'; ctx.textAlign = 'center';
      ctx.fillText(`📄 Page 1 of ${totalPages}  •  ${remainingItems} more rows`, w / 2, h - rewardHeight - 15);
      ctx.restore();
    }

    // ─── REWARD SECTION ───
    if (showRewardSection) {
      const ry = h - 56;
      const rg = ctx.createLinearGradient(12, ry, w - 12, ry);
      rg.addColorStop(0, '#FEF3C7'); rg.addColorStop(1, '#FFFBEB');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.roundRect(12, ry, w - 24, 44, 8); ctx.fill();
      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#92400E'; ctx.font = "bold 10px 'Inter', system-ui, sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText('Great job! You earned a sticker!', 22, ry + 18);
      ctx.font = "8px 'Inter', system-ui, sans-serif"; ctx.fillStyle = '#B45309';
      ctx.fillText('Collect 5 stickers for a reward!', 22, ry + 32);
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = '#D97706'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.roundRect(w - 145 + i * 24, ry + 8, 18, 18, 3); ctx.stroke();
        if (i < 2) { ctx.setLineDash([]); ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⭐', w - 136 + i * 24, ry + 21); }
      }
      ctx.setLineDash([]);
    }
  }, [config]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className={`relative group ${className || ''}`}>
      <div className="absolute -inset-2 rounded-2xl opacity-40 group-hover:opacity-70 transition-all duration-700" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #fed7aa 50%, #ddd6fe 100%)', filter: 'blur(8px)' }} />
      <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5">
        <canvas ref={canvasRef} width={420} height={580} className="w-full h-auto" style={{ maxWidth: 420, background: '#fff' }} />
      </div>
    </div>
  );
}
