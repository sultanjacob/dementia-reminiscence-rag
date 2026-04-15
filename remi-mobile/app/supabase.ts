import { createClient } from '@supabase/supabase-js';

// Replace these with your actual keys from Supabase Settings > API
const supabaseUrl = 'https://bphmzxsidlxfawqkvksr.supabase.co';
const supabaseAnonKey = 'PASTE_YOUR_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);