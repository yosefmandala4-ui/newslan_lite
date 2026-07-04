import { getSiteSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
    const settings = await getSiteSettings()
    const adsTxtContent = settings.ads_txt || ''

    return new Response(adsTxtContent, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    })
}
