import { createPublicClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

// Cache revalidation time in seconds
const REVALIDATE_TIME = 60

export const getBanners = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
        return data
    },
    ['banners'],
    { revalidate: REVALIDATE_TIME, tags: ['banners'] }
)

export const getLatestArticlesTop20 = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('articles')
            .select('id, title, slug, featured_image, created_at, is_premium, categories(name, bg_color)')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(20)
        return data
    },
    ['latest-articles-top-20'],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)

export const getCategoriesWithNews = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('categories')
            .select(`
        id,
        name,
        slug,
        show_on_home,
        display_order,
        bg_color,
        sidebar_ad_id,
        sidebar_ad:advertisements!sidebar_ad_id(*),
        sidebar_ad_2_id,
        sidebar_ad_2:advertisements!sidebar_ad_2_id(*),
        sidebar_ad_3_id,
        sidebar_ad_3:advertisements!sidebar_ad_3_id(*),
        articles(
          id,
          title,
          slug,
          featured_image,
          excerpt,
          is_premium,
          created_at
        )
      `)
            .eq('show_on_home', true)
            .neq('slug', 'uncategorized')
            .order('display_order', { ascending: true })
            .eq('articles.is_published', true)
            .order('created_at', { foreignTable: 'articles', ascending: false })
            .limit(6, { foreignTable: 'articles' })

        return data
    },
    ['categories-with-news'],
    { revalidate: REVALIDATE_TIME, tags: ['categories', 'articles'] }
)

export const getBreakingNews = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('articles')
            .select('title')
            .eq('is_published', true)
            .eq('is_breaking', true)
            .order('created_at', { ascending: false })
            .limit(5)
        return data
    },
    ['breaking-news'],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)

export const getFeedAds = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('advertisements')
            .select('*')
            .eq('placement', 'feed_between')
            .eq('is_active', true)
        return data
    },
    ['feed-ads'],
    { revalidate: REVALIDATE_TIME, tags: ['ads'] }
)

export const getSidebarAds = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('advertisements')
            .select('*')
            .eq('placement', 'sidebar_right')
            .eq('is_active', true)
        return data
    },
    ['sidebar-ads'],
    { revalidate: REVALIDATE_TIME, tags: ['ads'] }
)

export const getLatestGridNews = unstable_cache(
    async (page: number, itemsPerPage: number) => {
        const supabase = createPublicClient()
        const offset = (page - 1) * itemsPerPage
        const { data, count } = await supabase
            .from('articles')
            .select('id, title, slug, featured_image, created_at, is_premium, excerpt, categories(name, bg_color)', { count: 'exact' })
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + itemsPerPage - 1)
        return { data, count }
    },
    ['latest-grid-news'],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)

export const getTrendingNews = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('articles')
            .select('id, title, slug, featured_image, created_at, is_premium, categories(name, bg_color)')
            .eq('is_published', true)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('views_count', { ascending: false })
            .limit(7)
        return data
    },
    ['trending-news'],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)

export const searchArticles = async (query: string) => {
    const supabase = createPublicClient()
    const { data } = await supabase
        .from('articles')
        .select('*, categories(name, bg_color)')
        .eq('is_published', true)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
    return data
}

export const getArticleBySlug = (slug: string) => unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data, error } = await supabase
            .from('articles')
            .select('*, categories(id, name, slug), profiles(full_name)')
            .eq('slug', slug)
            .eq('is_published', true)
            .single()

        if (!error) return data

        console.warn('[getArticleBySlug] Query failed:', error.message)
        return null
    },
    [`article-by-slug-${slug}`],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)()

export const getNextArticle = (currentId: string) => unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('articles')
            .select('slug, title, featured_image')
            .eq('is_published', true)
            .neq('id', currentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        return data
    },
    [`next-article-${currentId}`],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)()

export const getIndeksArticles = unstable_cache(
    async (date: string, categoryId?: string) => {
        const supabase = createPublicClient()

        const startOfDay = `${date}T00:00:00Z`
        const endOfDay = `${date}T23:59:59Z`

        let query = supabase
            .from('articles')
            .select('*, categories(name, bg_color)')
            .eq('is_published', true)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false })

        if (categoryId && categoryId !== 'all') {
            query = query.eq('category_id', categoryId)
        }

        const { data } = await query
        return data
    },
    ['indeks-articles'],
    { revalidate: REVALIDATE_TIME, tags: ['articles'] }
)

export const getAllCategories = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('categories')
            .select('id, name, slug')
            .neq('slug', 'uncategorized')
            .order('display_order', { ascending: true })
        return data
    },
    ['all-categories'],
    { revalidate: REVALIDATE_TIME, tags: ['categories'] }
)

export const getPageBySlug = unstable_cache(
    async (slug: string) => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('pages')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single()
        return data
    },
    ['page-by-slug'],
    { revalidate: REVALIDATE_TIME, tags: ['pages'] }
)

// Cached layout data — long TTL since rarely changes
const LAYOUT_REVALIDATE = 120 // 2 minutes

export const getCachedLayoutData = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const [
            { data: cats },
            { data: navLinks },
            { data: headerAds },
            { data: skinAds },
            { data: footerPages }
        ] = await Promise.all([
            supabase.from('categories').select('*').order('display_order'),
            supabase.from('navigation_links').select('*').eq('is_active', true).order('display_order'),
            supabase.from('advertisements').select('*').eq('placement', 'header_bottom').eq('is_active', true).limit(1),
            supabase.from('advertisements').select('*').in('placement', ['skin_left', 'skin_right']).eq('is_active', true),
            supabase.from('pages').select('id, title, slug').eq('is_published', true).eq('is_footer', true).order('title')
        ])
        return { cats, navLinks, headerAds, skinAds, footerPages }
    },
    ['layout-data'],
    { revalidate: LAYOUT_REVALIDATE, tags: ['categories', 'navigation', 'ads', 'pages'] }
)

export const getCachedSiteSettings = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data, error } = await supabase
            .from('site_settings')
            .select('setting_key, setting_value')

        const DEFAULT = {
            site_name: 'Newslan',
            theme_color: '#0047ba',
            description: 'Portal berita terpercaya.',
            default_homepage: '/',
            logo_type: 'text' as const,
            site_logo_url: '',
            default_ai_language: 'id',
            groq_api_key: '',
            replicate_api_token: '',
            contact_whatsapp: '',
            contact_email: '',
            site_favicon_url: '/favicon.ico',
            site_url: '',
            header_scripts: '',
            active_template: 'tempo' as const,
            footer_copyright: '',
            ads_txt: ''
        }

        if (error || !data) return DEFAULT

        const settings = { ...DEFAULT }
        data.forEach((item: any) => {
            if (item.setting_key in settings || item.setting_key === 'site_description') {
                const key = item.setting_key === 'site_description' ? 'description' : item.setting_key
                ;(settings as any)[key] = item.setting_value
            }
        })
        return settings
    },
    ['site-settings'],
    { revalidate: 300, tags: ['settings'] } // Cache 5 menit
)

export const getCachedPageAds = unstable_cache(
    async () => {
        const supabase = createPublicClient()
        const { data } = await supabase
            .from('advertisements')
            .select('*')
            .eq('is_active', true)
            .in('placement', ['article_before', 'article_middle', 'article_after'])
        return data || []
    },
    ['page-ads'],
    { revalidate: REVALIDATE_TIME, tags: ['ads'] }
)

