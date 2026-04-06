import { Devotional } from '../types';
import { supabase } from '../lib/supabase';

export const getDailyDevotional = async (date: Date): Promise<Devotional | null> => {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('devotionals')
      .select('*')
      .eq('devotional_date', dateStr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No data found
      throw error;
    }

    return data as Devotional;
  } catch (error) {
    console.error('Error fetching daily devotional:', error);
    return null;
  }
};
