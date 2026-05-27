import { NextRequest, NextResponse } from 'next/server';
import { parseRSS } from '@/lib/scraper/rss-parser';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        // Authenticate request
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Harap login kembali.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const rssUrl = searchParams.get('url');

        if (!rssUrl) {
            return NextResponse.json(
                { success: false, error: 'Parameter URL feed RSS wajib disertakan.' },
                { status: 400 }
            );
        }

        const feed = await parseRSS(rssUrl);
        return NextResponse.json({ success: true, feed });
    } catch (error: any) {
        console.error('[RSS Fetch API Error]:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Gagal memproses feed RSS.' },
            { status: 500 }
        );
    }
}
