'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useWorksheetStore } from '@/stores/worksheet-store';
import type { Tier } from '@/types';

interface UserProfile {
  id: string;
  display_name: string | null;
  tier: Tier;
  access_code: string | null;
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithMagicLink = async (email: string) => {
    return await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    if (!user) return { success: false, error: 'Not logged in' };

    // Check if code exists and is unused
    const { data: codeData } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .single();

    if (!codeData) {
      return { success: false, error: 'Invalid or already used code' };
    }

    // Mark code as used
    await supabase
      .from('access_codes')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', code.toUpperCase());

    // Update user tier
    await supabase
      .from('users_profile')
      .update({ tier: codeData.tier, access_code: code.toUpperCase() })
      .eq('id', user.id);

    // Refresh profile
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
