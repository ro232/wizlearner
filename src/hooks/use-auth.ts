'use client';

import { useEffect, useState, useCallback } from 'react';
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const setTier = useWorksheetStore((s) => s.setTier);

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data as UserProfile);
        setTier(data.tier as Tier);
      }
    },
    [supabase, setTier]
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) await fetchProfile(user.id);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setTier('free');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, setTier]);

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
    setUser(null);
    setProfile(null);
    setTier('free');
  };

  const redeemAccessCode = async (
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Intră în cont ca să folosești codul.' };

    // Checked and applied on the server (supabase/migrations: redeem_access_code),
    // so the browser can never read the code list or set its own tier.
    const { error } = await supabase.rpc('redeem_access_code', { p_code: code.trim() });
    if (error) {
      return {
        success: false,
        error: error.message.includes('invalid_code')
          ? 'Codul nu este valid sau a fost deja folosit.'
          : 'Nu am putut verifica codul. Încearcă din nou.',
      };
    }

    await fetchProfile(user.id);
    return { success: true };
  };

  return {
    user,
    profile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    signOut,
    redeemAccessCode,
  };
}
