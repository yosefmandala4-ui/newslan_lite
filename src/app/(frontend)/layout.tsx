import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { getCachedLayoutData, getCachedSiteSettings } from '@/lib/data'

export default async function FrontendLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // All layout data is now cached — no DB round-trips on repeat requests
    const [settings, layoutData] = await Promise.all([
        getCachedSiteSettings(),
        getCachedLayoutData()
    ])

    const { cats, navLinks, headerAds, skinAds, footerPages } = layoutData
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
