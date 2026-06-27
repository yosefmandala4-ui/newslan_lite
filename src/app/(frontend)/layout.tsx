import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { createPublicClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/settings'

export default async function FrontendLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createPublicClient()
    const settings = await getSiteSettings()

    // Ambil data langsung tanpa unstable_cache untuk stabilitas di Edge
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

    const categories = cats || []
    const nLinks = navLinks || []
    const fPages = footerPages || []
    const headerAd = headerAds?.[0] || null
    const skinAdsData = {
        left: skinAds?.find((ad: any) => ad.placement === 'skin_left') || null,
        right: skinAds?.find((ad: any) => ad.placement === 'skin_right') || null
    }

    return (
        <LayoutWrapper
            categories={categories}
            headerAd={headerAd}
            skinAds={skinAdsData}
            siteName={settings.site_name}
            logoType={settings.logo_type}
            siteLogoUrl={settings.site_logo_url}
            contactWhatsapp={settings.contact_whatsapp}
            contactEmail={settings.contact_email}
            site_url={settings.site_url}
            site_favicon_url={settings.site_favicon_url}
            siteDescription={settings.description}
            activeTemplate={settings.active_template}
            footerCopyright={settings.footer_copyright}
            navLinks={[
                ...nLinks,
                ...fPages.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    href: `/p/${p.slug}`,
                    is_footer: true,
                    is_active: true
                }))
            ]}
        >
            {children}
        </LayoutWrapper>
    )
}
