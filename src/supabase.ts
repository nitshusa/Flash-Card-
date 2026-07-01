import { createClient } from '@supabase/supabase-js';

// Read configuration from Vite's environment variables, with explicit fallbacks
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://cjvrnxvouhdubhoausgy.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_FKv38hwEqT1yN0bgBonyjQ_polKRd4k';

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL is not defined in the environment.');
}
if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY is not defined in the environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
