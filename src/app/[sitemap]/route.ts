import { createClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/settings'

export const revalidate = 3600 // Cache for 1 hourtes cache

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sitemap: string }> }
) {
  const { sitemap } = await params
  const supabase = await createClient()
  const settings = await getSiteSettings()

  const host = request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const SITE_URL = host
    ? `${proto}://${host}`
    : (settings.site_url || process.env.NEXT_PUBLIC_SITE_URL || '')
  const SITE_NAME = settings.site_name || 'News Portal'

  // 1. Root Sitemap Index
  if (sitemap === 'sitemap.xml') {
    const { count } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)

    const totalArticles = count || 0
    const postsPerPage = 1000
    const postSitemapCount = Math.ceil(totalArticles / postsPerPage) || 1

    const sitemaps = [
      `${SITE_URL}/sitemap-pages.xml`,
      `${SITE_URL}/sitemap-news.xml`,
    ]

    for (let i = 1; i <= postSitemapCount; i++) {
      sitemaps.push(`${SITE_URL}/sitemap-posts-${i}.xml`)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map(url => `
  <sitemap>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('')}
</sitemapindex>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600'
      }
    })
  }

  // 2. Pages Sitemap
  if (sitemap === 'sitemap-pages.xml') {
    const staticPages = ['', '/news', '/redaksi', '/privacy-policy', '/pedoman-media-siber', '/indeks']
    const { data: categories } = await supabase.from('categories').select('slug')
    const allPages = [...staticPages, ...(categories || []).map(cat => `/category/${cat.slug}`)]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages.map(path => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`).join('')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800'
      }
    })
  }

  // 3. News Sitemap (Google News)
  if (sitemap === 'sitemap-news.xml') {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: articles } = await supabase
      .from('articles')
      .select('title, slug, created_at')
      .eq('is_published', true)
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false })

    const escapeXml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${(articles || []).map(a => `
  <url>
    <loc>${SITE_URL}/news/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.created_at).toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`).join('')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
      }
    })
  }

  // 4. Paginated Posts Sitemap
  const postsMatch = sitemap.match(/^sitemap-posts-(\d+)\.xml$/)
  if (postsMatch) {
    const page = parseInt(postsMatch[1])
    const postsPerPage = 1000
    const from = (page - 1) * postsPerPage
    const to = from + postsPerPage - 1

    const { data: articles } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .range(from, to)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${(articles || []).map(a => `
  <url>
    <loc>${SITE_URL}/news/${a.slug}</loc>
    <lastmod>${new Date(a.updated_at).toISOString()}</lastmod>
  </url>`).join('')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900'
      }
    })
  }

  return new Response('Not Found', { status: 404 })
}
