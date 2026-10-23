'use client';

import { useEffect } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';

/** Restores the last sheet from this browser once, after the first render. */
export function StoreHydration() {
  useEffect(() => {
    useWorksheetStore.persist.rehydrate();
  }, []);
  return null;
}
