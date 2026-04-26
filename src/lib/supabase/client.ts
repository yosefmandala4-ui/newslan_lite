import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'undefined' || supabaseKey === 'undefined') {
    console.error('Supabase Client: NEXT_PUBLIC URL or Key is missing!')
    const dummySupabase: any = new Proxy({}, {
        get: (target, prop) => {
            if (prop === 'then') return undefined;
            if (prop === 'auth') return {
                getUser: async () => ({ data: { user: null }, error: new Error('Missing config') }),
                getSession: async () => ({ data: { session: null }, error: new Error('Missing config') }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
            };
            return () => dummySupabase;
        }
    });
    return dummySupabase;
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
