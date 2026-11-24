'use client';

import { useEffect, useState } from 'react';

/**
 * A QR code drawn in the browser as an SVG (qrcode-generator, loaded only when the code is shown).
 * Each dark module is a path square: crisp on screen and when printed, no image request, nothing
 * sent anywhere.
 */
export function QrCode({ text, size = 200, label }: { text: string; size?: number; label: string }) {
  const [svg, setSvg] = useState<{ d: string; n: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setSvg(null);
    setFailed(false);
    import('qrcode-generator')
      .then(({ default: qrcode }) => {
        const qr = qrcode(0, 'M');
        qr.addData(text, 'Byte');
        qr.make();
        const n = qr.getModuleCount();
        let d = '';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
        if (live) setSvg({ d, n: n + 8 });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [text]);

  if (failed) return null;
  return (
    <div className="mx-auto bg-white rounded-xl border-2 border-ink p-1" style={{ width: size, height: size }}>
      {svg ? (
        <svg viewBox={`0 0 ${svg.n} ${svg.n}`} width="100%" height="100%" role="img" aria-label={label} shapeRendering="crispEdges" data-qr>
          <rect width={svg.n} height={svg.n} fill="#fff" />
          <path d={svg.d} fill="#1F2A44" />
        </svg>
      ) : (
        <div className="w-full h-full rounded-lg bg-slate-100 animate-pulse" aria-hidden />
      )}
    </div>
  );
}
