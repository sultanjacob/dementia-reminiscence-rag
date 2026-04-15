import { createClient } from '@supabase/supabase-js';

// Replace these with your actual keys from Supabase Settings > API
const supabaseUrl = 'https://bphmzxsidlxfawqkvksr.supabase.co';
const supabaseAnonKey = 'sb_publishable_-RYTM7gdaV_1IE3d6F9GNQ_OEoAH3lY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);