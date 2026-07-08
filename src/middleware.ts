import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkBotAndRateLimit } from '@/lib/bot-guard'

export async function middleware(request: NextRequest) {
    try {
        // 1. Bot & Rate Limit Guard (runs first, very fast — no DB calls)
        const guardResponse = checkBotAndRateLimit(request)
        if (guardResponse) return guardResponse

        // 2. Supabase session handling (admin routes only)
        return await updateSession(request)
    } catch (e) {
        console.error('Middleware error:', e)
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
