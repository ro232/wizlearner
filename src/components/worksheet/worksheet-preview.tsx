'use client';

import { useMemo } from 'react';
import type { WorksheetConfig, Tier } from '@/types';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { PagesPreview } from './pages-preview';

interface WorksheetPreviewProps {
  config: WorksheetConfig;
  tier?: Tier;
  className?: string;
  /** CSS width of the page preview in pixels. */
  width?: number;
}

/**
 * Live preview. It draws the very same page description the PDF uses, so the
 * printout matches the screen.
 */
export function WorksheetPreview({ config, tier = 'free', className, width = 420 }: WorksheetPreviewProps) {
  const pages = useMemo(() => buildWorksheetPages(config, tier), [config, tier]);
  const isEmpty = useMemo(() => !hasContent(config, tier), [config, tier]);
  return (
    <PagesPreview
      pages={pages}
      width={width}
      className={className}
      pageLabel="Pagina"
      emptyMessage={isEmpty ? 'Alege ce exersăm ca să vezi fișa' : null}
    />
  );
}
