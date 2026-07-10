import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { slug } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        const zoneId = process.env.CLOUDFLARE_ZONE_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newslan.id';

        // Jika user belum memasukkan API Key, kita tidak gagalkan proses simpan admin
        if (!zoneId || !apiToken) {
            console.warn('⚠️ CLOUDFLARE_ZONE_ID atau CLOUDFLARE_API_TOKEN belum diatur. Melewati proses hapus cache.');
            return NextResponse.json({ 
                success: true, 
                warning: 'Kunci API Cloudflare belum diatur. Cache tidak dihapus otomatis.' 
            });
        }

        // Kita hapus cache untuk artikel tersebut DAN halaman beranda
        const filesToPurge = [
            `${siteUrl}/news/${slug}`,
            `${siteUrl}/`
        ];

        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: filesToPurge
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('❌ Error API Cloudflare:', data);
            return NextResponse.json({ error: 'Gagal menghapus cache di Cloudflare', details: data }, { status: 500 });
        }

        console.log(`✅ Berhasil menghapus cache Cloudflare untuk: /news/${slug}`);
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ Exception di API Hapus Cache:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
