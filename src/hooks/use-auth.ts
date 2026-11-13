'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { safeNextPath } from '@/lib/safe-redirect';
import type { Tier } from '@/types';

/** Where to land after an email or Google sign-in: the page in ?next=, if it is on this site. */
function callbackUrl(): string {
  const next = safeNextPath(new URLSearchParams(window.location.search).get('next'));
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  tier: Tier;
  access_code: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
  stripe_customer_id?: string | null;
  children: Array<{ name: string; age: number; avatar_url?: string }>;
  preferences: Record<string, unknown>;
}

/**
 * One sign-in state for the whole page. The menu, the page and the plans window all call
 * useAuth(); they used to open three listeners and ask for the profile three times. Now the
 * first caller starts a single listener and everyone reads the same state.
 */
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** The profile (and so the plan) could not be read; the last known plan is kept meanwhile. */
  profileError: boolean;
}

let state: AuthState = { user: null, profile: null, loading: true, profileError: false };
const SERVER_STATE: AuthState = state;
const listeners = new Set<() => void>();
let started = false;
let profileRequest = 0;

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Read the profile and, with it, the plan. A failed read (weak signal, a hiccup of the server)
 * is tried once more and otherwise leaves the last known plan in place: a subscriber is never
 * shown the free plan just because one request did not get through.
 */
async function fetchProfile(userId: string, attempt = 0): Promise<void> {
  const request = ++profileRequest;
  let data: unknown = null;
  let failed = false;
  try {
    const res = await createClient().from('users_profile').select('*').eq('id', userId).single();
    data = res.data;
    failed = !!res.error || !res.data;
  } catch {
    failed = true;
  }
  if (request !== profileRequest || state.user?.id !== userId) return; // a newer answer is on its way, or the person signed out
  if (!failed && data) {
    const profile = data as UserProfile;
    setState({ profile, profileError: false });
    useWorksheetStore.getState().setTier(profile.tier);
    return;
  }
  if (attempt < 1) {
    setTimeout(() => void fetchProfile(userId, attempt + 1), 1500);
    return;
  }
  console.error('Could not read the profile; keeping the last known plan');
  setState({ profileError: true });
}

function signedOut() {
  profileRequest++;
  setState({ user: null, profile: null, profileError: false });
  useWorksheetStore.getState().setTier('free');
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const supabase = createClient();

  supabase.auth
    .getUser()
    .then(({ data: { user } }) => {
      if (user) {
        setState({ user });
        return fetchProfile(user.id);
      }
    })
    .catch(() => undefined)
    .finally(() => setState({ loading: false }));

  // The callback must stay synchronous and must not call Supabase itself: the library holds a
  // lock while it runs, and awaiting another Supabase call inside it can deadlock every later
  // request (also in other tabs). The profile is read right after, outside the callback.
  supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    const previousId = state.user?.id;
    if (!next) {
      if (previousId || state.profile) signedOut();
      return;
    }
    setState({ user: next });
    // a refreshed token of the same person does not need the profile again
    if (next.id !== previousId || !state.profile) setTimeout(() => void fetchProfile(next.id), 0);
  });
}

export function useAuth() {
  const { user, profile, loading, profileError } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  useEffect(() => start(), []);
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });
  };

  const signInWithMagicLink = async (email: string) => {
    return await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    signedOut();
  };

  const redeemAccessCode = async (
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Intră în cont ca să folosești codul.' };

    // Checked and applied on the server (supabase/migrations: redeem_access_code),
    // so the browser can never read the code list or set its own tier.
    const { data, error } = await supabase.rpc('redeem_access_code', { p_code: code.trim() });
    if (error) return { success: false, error: 'Nu am putut verifica codul. Încearcă din nou.' };
    if (data === 'invalid_code') return { success: false, error: 'Codul nu este valid sau a fost deja folosit.' };
    if (data === 'too_many_attempts') return { success: false, error: 'Prea multe coduri greșite. Încearcă din nou peste o oră.' };
    if (data !== 'starter' && data !== 'full') return { success: false, error: 'Nu am putut activa codul.' };

    await fetchProfile(user.id, 1);
    return { success: true };
  };

  return {
    user,
    profile,
    loading,
    profileError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    signOut,
    redeemAccessCode,
  };
}
