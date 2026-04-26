import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Dummy client to safely handle missing env vars at build time without crashing or hanging
const dummySupabase: any = new Proxy({}, {
    get: (target, prop) => {
        if (prop === 'then') return undefined; // Prevent infinite await hangs
        if (prop === 'data') return null;
        if (prop === 'error') return new Error('Missing Config');
        if (prop === 'count') return 0;
        return () => dummySupabase; // Allow infinite chaining like .from().select().eq().single()
    }
});

export async function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'undefined' || supabaseKey === 'undefined') {
        console.error('Supabase URL or Key is missing!')
        return dummySupabase;
    }

    const cookieStore = await cookies()

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
}

export function createPublicClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'undefined' || supabaseKey === 'undefined') {
        return dummySupabase;
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() { return [] },
                setAll(cookiesToSet) { },
            },
        }
    )
}

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'undefined' || supabaseKey === 'undefined') {
        return dummySupabase;
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() { return [] },
                setAll(cookiesToSet) { },
            },
        }
    )
}
