/**
 * Bot & Rate Limit Detection for Cloudflare Workers Edge
 *
 * Strategy:
 * 1. Block known bad bots via User-Agent blacklist
 * 2. Use Cloudflare bot score headers when available
 * 3. Rate-limit /news/* article reads per IP (in-memory sliding window)
 * 4. Return 429 with a friendly page for rate-limited users
 */

import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// 1. Known malicious / scraper bot User-Agent patterns
// ---------------------------------------------------------------------------
const BAD_BOT_PATTERNS = [
    /scrapy/i,
    /python-requests/i,
    /go-http-client/i,
    /java\/\d/i,
    /curl\//i,
    /wget\//i,
    /libwww-perl/i,
    /lwp-trivial/i,
    /httpclient/i,
    /okhttp/i,
    /axios\/\d/i,
    /node-fetch/i,
    /got\//i,
    /puppeteer/i,
    /playwright/i,
    /phantomjs/i,
    /headlesschrome/i,
    /selenium/i,
    /mechanize/i,
    /nikto/i,
    /masscan/i,
    /nmap/i,
    /zgrab/i,
    /semrushbot/i,
    /ahrefsbot/i,
    /mj12bot/i,
    /dotbot/i,
    /blexbot/i,
    /petalbot/i,
    /serpstatbot/i,
    /siteauditbot/i,
    /magpie-crawler/i,
]

// Allowed legitimate crawlers (search engines) — never block these
const ALLOWED_BOTS = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,       // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
]

// ---------------------------------------------------------------------------
// 2. In-memory sliding window rate limiter (resets per Worker cold start)
//    For production, replace with Cloudflare KV or Durable Objects.
// ---------------------------------------------------------------------------
interface WindowEntry {
    count: number
    windowStart: number
}

const rateLimitMap = new Map<string, WindowEntry>()

// Config
const RATE_LIMIT_WINDOW_MS = 60 * 1000   // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30       // max article reads per minute per IP
const RATE_LIMIT_BURST_WINDOW_MS = 5000  // 5 seconds
const RATE_LIMIT_BURST_MAX = 8           // max reads within burst window

// Separate burst tracker
const burstMap = new Map<string, WindowEntry>()

function isRateLimited(ip: string): { limited: boolean; reason: string } {
    const now = Date.now()

    // --- Normal window ---
    const entry = rateLimitMap.get(ip)
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, windowStart: now })
    } else {
        entry.count++
        if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
            return { limited: true, reason: `Exceeded ${RATE_LIMIT_MAX_REQUESTS} article reads/minute` }
        }
    }

    // --- Burst window ---
    const burst = burstMap.get(ip)
    if (!burst || now - burst.windowStart > RATE_LIMIT_BURST_WINDOW_MS) {
        burstMap.set(ip, { count: 1, windowStart: now })
    } else {
        burst.count++
        if (burst.count > RATE_LIMIT_BURST_MAX) {
            return { limited: true, reason: `Burst limit: ${RATE_LIMIT_BURST_MAX} reads in 5s` }
        }
    }

    // Cleanup old entries periodically (simple GC to avoid memory leak)
    if (rateLimitMap.size > 5000) {
        for (const [key, val] of rateLimitMap) {
            if (now - val.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitMap.delete(key)
        }
    }

    return { limited: false, reason: '' }
}

// ---------------------------------------------------------------------------
// 3. HTML page for blocked users
// ---------------------------------------------------------------------------
function blockedResponse(title: string, message: string, status: number) {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#0f1117;color:#fff;display:flex;align-items:center;
         justify-content:center;min-height:100vh;padding:2rem}
    .card{background:#1a1d27;border:1px solid #2d3144;border-radius:1.5rem;
          padding:3rem 2.5rem;max-width:480px;text-align:center;
          box-shadow:0 25px 50px rgba(0,0,0,.5)}
    .icon{font-size:3.5rem;margin-bottom:1.5rem}
    h1{font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:.75rem}
    p{font-size:.95rem;color:#9ba3b8;line-height:1.7;margin-bottom:1.5rem}
    .badge{display:inline-block;padding:.4rem 1rem;background:#0047ba22;
           color:#4d8bff;border:1px solid #0047ba44;border-radius:999px;
           font-size:.8rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
    a{color:#4d8bff;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">Newslan.id Security</span>
    <br/><br/>
    <p style="font-size:.8rem">
      Jika Anda bukan bot, silakan <a href="/">kembali ke beranda</a> atau tunggu beberapa saat.
    </p>
  </div>
</body>
</html>`
    return new NextResponse(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        }
    })
}

// ---------------------------------------------------------------------------
// 4. Main guard function — export for use in middleware.ts
// ---------------------------------------------------------------------------
export function checkBotAndRateLimit(request: NextRequest): NextResponse | null {
    const ua = request.headers.get('user-agent') || ''
    const pathname = request.nextUrl.pathname

    // Only apply to article pages and API routes (not static assets)
    const isArticlePage = pathname.startsWith('/news/')
    const isApiRoute = pathname.startsWith('/api/')

    if (!isArticlePage && !isApiRoute) return null

    // (A) Cloudflare bot score — if header is present and bot score < 10, block
    const cfBotScore = request.headers.get('cf-bot-management-score')
    if (cfBotScore !== null) {
        const score = parseInt(cfBotScore, 10)
        if (!isNaN(score) && score < 10) {
            return blockedResponse(
                'Akses Ditolak – Bot Terdeteksi',
                'Cloudflare mendeteksi aktivitas bot pada perangkat Anda. Akses ke halaman berita dibatasi untuk melindungi server kami.',
                403
            )
        }
    }

    // (B) Always allow legitimate search engine bots
    const isAllowedBot = ALLOWED_BOTS.some(p => p.test(ua))
    if (isAllowedBot) return null

    // (C) Block known bad bots
    const isBadBot = BAD_BOT_PATTERNS.some(p => p.test(ua))
    if (isBadBot) {
        return blockedResponse(
            'Bot Terdeteksi',
            'Akses otomatis ke portal berita ini tidak diperbolehkan. Jika Anda manusia, harap gunakan browser biasa.',
            403
        )
    }

    // (D) Suspicious: empty User-Agent
    if (ua.trim() === '') {
        return blockedResponse(
            'Permintaan Tidak Valid',
            'Permintaan Anda tidak memiliki User-Agent yang valid. Akses ditolak.',
            400
        )
    }

    // (E) Rate limit by IP (only for article pages)
    if (isArticlePage) {
        const ip =
            request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-real-ip') ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown'

        const { limited, reason } = isRateLimited(ip)
        if (limited) {
            return blockedResponse(
                'Terlalu Banyak Permintaan',
                `Anda membaca berita terlalu cepat. Sistem kami mendeteksi pola tidak wajar: ${reason}. Silakan tunggu sebentar.`,
                429
            )
        }
    }

    return null // All checks passed
}
