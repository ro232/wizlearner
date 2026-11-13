'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** True when this page view is a reload, so a "came back from Stripe" event is not counted twice. */
export function isReload(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === 'reload';
  } catch {
    return false;
  }
}

/**
 * On the pricing page: records that the visitor came back from Stripe Checkout without paying
 * (Stripe returns to /preturi?plata=anulata). Renders nothing and sends no personal data.
 */
export function CheckoutCancelTracker() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('plata') === 'anulata' && !isReload()) {
      track('checkout_return', { result: 'cancel' });
    }
  }, []);
  return null;
}
