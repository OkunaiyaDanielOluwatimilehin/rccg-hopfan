import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast so we don't silently call placeholder URLs and produce confusing network errors.
  throw new Error(
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env.local` (or `.env`), then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
