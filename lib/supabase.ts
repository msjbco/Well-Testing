import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a placeholder client if env vars are missing (for development)
// This allows the app to load without crashing, but Supabase calls will fail
let supabase: ReturnType<typeof createClient>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are not set');
  console.warn('⚠️ Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  // Create a dummy client to prevent crashes - actual calls will fail gracefully
  supabase = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
} else {
  // Create Supabase client with offline support
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export { supabase };

// Helper to check if user is authenticated
export async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session.user;
}

// Helper to check if user is a technician
export async function isTechnician() {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Check user metadata or a separate technicians table
  // Adjust this based on your auth setup
  const { data, error } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  // If technicians table doesn't exist, fall back to checking user metadata
  if (error) {
    return user.user_metadata?.role === 'technician' || user.user_metadata?.is_technician === true;
  }
  
  return !!data;
}
