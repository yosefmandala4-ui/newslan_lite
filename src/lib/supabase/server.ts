import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Key is missing!')
        // Return a proxy object that handles calls gracefully to avoid crashes
        return new Proxy({} as any, {
            get: () => () => ({ from: () => ({ select: () => ({ data: null, error: new Error('Missing Config') }) }) })
        })
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

    if (!supabaseUrl || !supabaseKey) {
        return new Proxy({} as any, {
            get: () => () => ({ from: () => ({ select: () => ({ data: null, error: new Error('Missing Config') }) }) })
        })
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

    if (!supabaseUrl || !supabaseKey) {
        return new Proxy({} as any, {
            get: () => () => ({ from: () => ({ select: () => ({ data: null, error: new Error('Missing Config') }) }) })
        })
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
