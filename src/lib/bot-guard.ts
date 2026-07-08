/**
 * Bot Guard — Cloudflare Workers Edge
 *
 * Strategy (NO rate limiting — prevents false positives on real users):
 * 1. Block known bad/scraper bots via User-Agent blacklist
 * 2. Use Cloudflare bot score headers when available (score < 10 = bot)
 * 3. Block empty User-Agents (typical of headless scripts)
 * 4. Always allow known search engine & social crawlers
 *
 * Real traffic protection is handled by Cloudflare edge cache:
 * → cached responses are served directly from edge, Worker never runs.
 */

import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Known malicious / scraper bot User-Agent patterns
// ---------------------------------------------------------------------------
const BAD_BOT_PATTERNS = [
    /scrapy/i,
    /python-requests/i,
    /python-urllib/i,
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
    /dataforseobot/i,
    /bytespider/i,
    /claudebot/i,
    /gptbot/i,
    /ccbot/i,
    /anthropic-ai/i,
]

// Allowed legitimate crawlers — NEVER block these
const ALLOWED_BOTS = [
    /googlebot/i,
    /google-inspectiontool/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /facebot/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /applebot/i,
    /googleother/i,
]

// ---------------------------------------------------------------------------
// Friendly HTML block page
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
      Jika Anda bukan bot, silakan <a href="/">kembali ke beranda</a>.
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
// Main guard — export for use in middleware.ts
// ---------------------------------------------------------------------------
export function checkBotAndRateLimit(request: NextRequest): NextResponse | null {
    const ua = request.headers.get('user-agent') || ''
    const pathname = request.nextUrl.pathname

    // Only apply checks to article pages and API routes
    const isArticlePage = pathname.startsWith('/news/')
    const isApiRoute = pathname.startsWith('/api/')
    if (!isArticlePage && !isApiRoute) return null

    // (A) Cloudflare bot management score — score < 10 means confirmed bot
    const cfBotScore = request.headers.get('cf-bot-management-score')
    if (cfBotScore !== null) {
        const score = parseInt(cfBotScore, 10)
        if (!isNaN(score) && score < 10) {
            return blockedResponse(
                'Akses Ditolak — Bot Terdeteksi',
                'Cloudflare mendeteksi aktivitas bot. Akses ke halaman berita dibatasi.',
                403
            )
        }
    }

    // (B) Always allow legitimate search engines & social crawlers
    if (ALLOWED_BOTS.some(p => p.test(ua))) return null

    // (C) Block known bad/scraper bots by User-Agent
    if (BAD_BOT_PATTERNS.some(p => p.test(ua))) {
        return blockedResponse(
            'Bot Terdeteksi',
            'Akses otomatis ke portal berita ini tidak diperbolehkan. Gunakan browser biasa untuk membaca berita.',
            403
        )
    }

    // (D) Block completely empty User-Agent (typical of raw scripts)
    if (ua.trim() === '') {
        return blockedResponse(
            'Permintaan Tidak Valid',
            'Permintaan Anda tidak memiliki User-Agent yang valid.',
            400
        )
    }

    return null // All checks passed — allow through
}
