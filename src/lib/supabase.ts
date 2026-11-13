import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const isPlaceholderUrl =
  !supabaseUrl || supabaseUrl.includes('your-project-ref.supabase.co');
const isPlaceholderKey =
  !supabaseAnonKey || supabaseAnonKey === 'your-anon-public-key';

export const isSupabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

