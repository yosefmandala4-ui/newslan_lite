import { notFound } from 'next/navigation'
import {
    getArticleBySlug,
    getNextArticle,
    getBanners,
    getCachedSiteSettings,
    getCachedPageAds
} from '@/lib/data'
import { optimizeCloudinaryUrl } from '@/lib/utils'
import PrefetchNextArticle from '@/components/news/PrefetchNextArticle'
import BannerSlider from '@/components/ui/BannerSlider'
import { Metadata } from 'next'
import DetailDetik from '@/components/templates/details/DetailDetik'
import DetailTempo from '@/components/templates/details/DetailTempo'
import DetailCNN from '@/components/templates/details/DetailCNN'
import { createPublicClient } from '@/lib/supabase/server'

// ISR: re-render at most once per 60 seconds
// Cloudflare edge will serve cached HTML for all requests in between
export const revalidate = 60


// Generate Metadata for SEO and Social Sharing
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params

    const [article, settings] = await Promise.all([
        getArticleBySlug(slug),
        getCachedSiteSettings()
    ])

    let siteUrl = settings.site_url || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Guard against invalid URLs stored in site_settings (e.g. email addresses)
    try { new URL(siteUrl) } catch { siteUrl = 'http://localhost:3000' }

    if (!article) return { title: `Article Not Found - ${settings.site_name}` }
    const title = article.title
    const description = article.excerpt || article.title

    // Fallback to logo if no featured image exists
    const imageUrl = article.featured_image || `${siteUrl}/logo.png`

    return {
        title: `${title} - ${settings.site_name}`,
        description,
        keywords: article.focus_keyword || undefined,
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical: `/news/${slug}`,
        },
        openGraph: {
            title,
            description,
            url: `/news/${slug}`,
            siteName: settings.site_name,
            locale: 'id_ID',
            type: 'article',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                }
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        // Meta tags to help social crawlers
        other: {
            'og:image:alt': title,
            'og:image:type': 'image/jpeg',
            'og:image:width': '1200',
            'og:image:height': '630',
        }
    }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params

        // All cached — minimal DB hits on repeat requests
        const [siteSettings, article, pageAds, banners] = await Promise.all([
            getCachedSiteSettings(),
            getArticleBySlug(slug),
            getCachedPageAds(),
            getBanners()
        ])

        if (!article) {
            return notFound()
        }

        // Fetch next article (also cached per article id)
        const nextArticle = await getNextArticle(article.id)

        // Fire-and-forget view increment (non-blocking, no await)
        const supabase = createPublicClient()
        supabase.rpc('increment_article_views', { article_id: article.id }).then(({ error }: any) => {
            if (error) console.error('RPC Error:', error)
        })

        const activeTemplate = siteSettings.active_template || 'tempo'
        const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/news/${slug}`

        const beforeAd = pageAds?.find((a: any) => a.placement === 'article_before')
        const middleAd = pageAds?.find((a: any) => a.placement === 'article_middle')
        const afterAd = pageAds?.find((a: any) => a.placement === 'article_after')

        // Create JSON-LD for Articles (SEO)
        const articleJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            image: [article.featured_image || `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`],
            datePublished: article.created_at,
            dateModified: article.updated_at || article.created_at,
            author: [{
                '@type': 'Person',
                name: article.profiles?.full_name || `Redaksi ${siteSettings.site_name || 'Portal Berita'}`,
                url: `${siteSettings.site_url}/redaksi`,
            }],
            publisher: {
                '@type': 'Organization',
                name: siteSettings.site_name || 'Portal Berita',
                logo: {
                    '@type': 'ImageObject',
                    url: `${siteSettings.site_url}/logo.png`,
                },
            },
            description: article.excerpt || article.title,
        }

        const props = {
            article,
            nextArticle,
            banners: banners || [],
            siteSettings,
            currentUrl,
            pageAds: {
                beforeAd,
                middleAd,
                afterAd
            }
        }

        switch (activeTemplate) {
            case 'cnn':
                return <DetailCNN {...props} />
            case 'detik':
                return <DetailDetik {...props} />
            case 'tempo':
            default:
                return <DetailTempo {...props} />
        }
    } catch (err) {
        console.error('Article Page Error:', err)
        return notFound()
    }
}
