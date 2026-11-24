'use client';

import { useEffect, type RefObject } from 'react';

/**
 * A field that is typed into before React has taken over the page (slow phone, slow network) keeps the
 * text in the page but not in React's state, and the next render would wipe it. On mount this takes
 * what is already in the field into the state. Declare it after any effect that restores a draft, so
 * what the person has just typed wins over the old draft.
 */
export function useTypedBeforeHydration(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
  setValue: (value: string) => void,
): void {
  useEffect(() => {
    const typed = ref.current?.value;
    if (typed) setValue(typed);
    // only once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
