import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ncpfdkvdzaxtavjafpxt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcGZka3ZkemF4dGF2amFmcHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzOTQxOTksImV4cCI6MjEwOTk3MDE5OX0.9xSOihvzQazcQuoVq7hjkjJPjStFyyxpcOjoMjP8GiQ';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const isPlaceholderUrl = !rawUrl || rawUrl.includes('your-project-ref.supabase.co');
const isPlaceholderKey = !rawKey || rawKey === 'your-anon-public-key';

export const supabaseUrl = !isPlaceholderUrl ? rawUrl! : DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = !isPlaceholderKey ? rawKey! : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
