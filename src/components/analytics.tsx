'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/** Starts analytics after the page is idle, so it never slows the first paint. */
export function Analytics() {
  useEffect(() => {
    const start = () => initAnalytics();
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start);
    else setTimeout(start, 1500);
  }, []);
  return null;
}
