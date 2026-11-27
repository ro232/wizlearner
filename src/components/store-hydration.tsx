'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { hydrateRoleStore } from '@/stores/role-store';

// Before the first paint in the browser; an ordinary effect on the server (where neither runs).
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Restores, once, what this browser remembers: the last sheet (after the first render) and the
 * chosen role, teacher or parent. The role is read before the first paint, so the menu of the role
 * replaces the general one (the one in the server's HTML) without a visible jump.
 */
export function StoreHydration() {
  useEffect(() => {
    useWorksheetStore.persist.rehydrate();
  }, []);
  useBeforePaint(() => {
    hydrateRoleStore();
  }, []);
  return null;
}
