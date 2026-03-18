'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WorksheetConfig } from '@/types';

interface SavedWorksheet {
  id: string;
  name: string;
  configuration: WorksheetConfig;
  thumbnail_url: string | null;
  is_public: boolean;
  downloads_count: number;
  rating_avg: number;
  created_at: string;
  updated_at: string;
}

export function useWorksheets(userId: string | undefined) {
  const [worksheets, setWorksheets] = useState<SavedWorksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchWorksheets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('saved_worksheets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (data) setWorksheets(data as SavedWorksheet[]);
    setLoading(false);
  }, [userId, supabase]);

  const saveWorksheet = async (name: string, config: WorksheetConfig) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('saved_worksheets')
      .insert({ user_id: userId, name, configuration: config })
      .select()
      .single();

    if (data) setWorksheets((prev) => [data as SavedWorksheet, ...prev]);
    return { data, error };
  };

  const updateWorksheet = async (
    id: string,
    updates: Partial<SavedWorksheet>
  ) => {
    const { data, error } = await supabase
      .from('saved_worksheets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (data) {
      setWorksheets((prev) =>
        prev.map((w) => (w.id === id ? (data as SavedWorksheet) : w))
      );
    }
    return { data, error };
  };

  const deleteWorksheet = async (id: string) => {
    await supabase.from('saved_worksheets').delete().eq('id', id);
    setWorksheets((prev) => prev.filter((w) => w.id !== id));
  };

  return {
    worksheets,
    loading,
    fetchWorksheets,
    saveWorksheet,
    updateWorksheet,
    deleteWorksheet,
  };
}
