'use client';

import { useMemo } from 'react';
import { getGlyph } from '@/lib/glyphs/data';
import { flattenSubpath } from '@/lib/glyphs/geometry';
import { useWorksheetStore } from '@/stores/worksheet-store';
import type { FontStyle } from '@/types';

type Density = 'sparse' | 'normal' | 'dense';
const GAP: Record<Density, number> = { sparse: 1.5, normal: 1, dense: 0.55 };
const W = 10; // pen width in glyph units, as on the sheet

/** The letter A drawn exactly the way the copies on the sheet are: dashes, dots or outline. */
function Sample({ variant, density, size = 44 }: { variant: FontStyle; density: Density; size?: number }) {
  const d = useMemo(() => {
    const g = getGlyph('A');
    if (!g) return '';
    return g.strokes
      .flatMap((s) => s.subpaths.map((sp) => flattenSubpath(sp)))
      .map((pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(''))
      .join('');
  }, []);
  const gap = GAP[density];
  const common = { d, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="-12 -12 104 124" width={size} height={size * 1.2} aria-hidden>
      {variant === 'outline' ? (
        <>
          <path {...common} stroke="#475569" strokeWidth={W * 1.3} />
          <path {...common} stroke="#fff" strokeWidth={W * 0.7} />
        </>
      ) : variant === 'dotted' ? (
        <path {...common} stroke="#475569" strokeWidth={W} strokeDasharray={`0.01 ${W * Math.max(1.2, 1.5 * gap)}`} />
      ) : (
        <path {...common} stroke="#475569" strokeWidth={W} strokeLinecap="butt" strokeDasharray={`${W} ${W * 2 * gap}`} />
      )}
    </svg>
  );
}

/** Choose how the letters to trace look, by their real look, and how close the dashes or dots are. */
export function TraceStylePicker() {
  const config = useWorksheetStore((s) => s.config);
  const { setFontStyle, setTraceDensity } = useWorksheetStore();
  const density: Density = config.traceDensity ?? 'normal';
  const style: FontStyle = config.fontStyle === 'cursive' ? 'dashed' : config.fontStyle;
  const btn = (on: boolean) =>
    `flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${on ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {([['dashed', 'Liniuțe'], ['dotted', 'Puncte'], ['outline', 'Contur']] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setFontStyle(v)} aria-pressed={style === v} aria-label={`Literele de trasat: ${label}`} className={btn(style === v)}>
            <Sample variant={v} density={density} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
      {style !== 'outline' && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">{style === 'dotted' ? 'Cât de dese sunt punctele' : 'Cât de dese sunt liniuțele'}</div>
          <div className="grid grid-cols-3 gap-2">
            {([['sparse', 'Rare'], ['normal', 'Normale'], ['dense', 'Dese']] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setTraceDensity(v)} aria-pressed={density === v} className={btn(density === v)}>
                <svg viewBox="0 0 120 14" width="96" height="12" aria-hidden>
                  <line x1="6" y1="7" x2="114" y2="7" stroke="#475569" strokeWidth="6" strokeLinecap={style === 'dotted' ? 'round' : 'butt'}
                    strokeDasharray={style === 'dotted' ? `0.01 ${6 * Math.max(1.2, 1.5 * GAP[v])}` : `6 ${6 * 2 * GAP[v]}`} />
                </svg>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
