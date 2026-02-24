import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Use service role key for backend (bypasses RLS)
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
