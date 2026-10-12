'use client';

import { useMemo } from 'react';
import type { WorksheetConfig, Tier } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
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
  const isRo = config.alphabet === 'ro';
  const isEmpty = config.selectedItems.length === 0;
  return (
    <PagesPreview
      pages={pages}
      width={width}
      className={className}
      pageLabel={isRo ? 'Pagina' : 'Page'}
      emptyMessage={isEmpty ? (isRo ? 'Alege litere ca să vezi fișa' : 'Pick items to see preview') : null}
    />
  );
}
