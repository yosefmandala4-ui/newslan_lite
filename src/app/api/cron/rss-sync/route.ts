import { NextRequest, NextResponse } from 'next/server';
import { parseRSS } from '@/lib/scraper/rss-parser';
import { extractArticleContent } from '@/lib/scraper/extractor';
import { rewriteArticle } from '@/lib/ai/groq';
import { migrateImageToCloudinary } from '@/app/actions/wordpress-import';
import { createClient } from '@/lib/supabase/server';
import { getSiteSettings } from '@/lib/settings';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');

        // 1. Validate Cron Secret
        const settings = await getSiteSettings(supabase);
        // Look up cron_secret in settings (if defined) or fallback to process.env or a default secret
        const cronSecret = settings.groq_api_key 
            ? (settings.groq_api_key.substring(0, 15)) // safe fallback secret using API key prefix
            : 'newslan_cron_secret';
        
        // If the user specified a custom cron_secret, or default
        const { data: customSecret } = await supabase
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'cron_secret')
            .single();

        const activeSecret = customSecret?.setting_value || cronSecret;

        if (!secret || secret !== activeSecret) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Token secret tidak valid.' },
                { status: 401 }
            );
        }

        // 2. Fetch Active Jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('rss_jobs')
            .select('*')
            .eq('is_active', true);

        if (jobsError) throw jobsError;

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ success: true, message: 'Tidak ada Auto Job aktif untuk diproses.' });
        }

        const log: string[] = [];
        let totalImported = 0;

        // Fetch author (default to first admin user found)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        const authorId = profiles?.[0]?.id || null;

        if (!authorId) {
            throw new Error('Tidak dapat menemukan author profile default.');
        }

        // 3. Process each active RSS Job
        for (const job of jobs) {
            log.push(`Memproses Job: ${job.name} (${job.feed_url})`);
            try {
                const feed = await parseRSS(job.feed_url);
                // Process the latest 2 items of the feed to avoid timeout
                const itemsToProcess = feed.items.slice(0, 2);

                for (const item of itemsToProcess) {
                    // Check if already imported using hidden HTML comment search
                    const { data: existing } = await supabase
                        .from('articles')
                        .select('id')
                        .like('content', `%<!-- rss_source_link: ${item.link} -->%`)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        log.push(`- Skip (Sudah pernah di-import): ${item.title}`);
                        continue;
                    }

                    log.push(`- Menulis ulang & Mengimport: ${item.title}`);

                    // Extract content
                    const extracted = await extractArticleContent(item.link);
                    const sourceContent = extracted.content || item.description || 'Konten tidak tersedia.';

                    // Rewrite with Groq
                    const rewritten = await rewriteArticle(
                        extracted.title || item.title,
                        sourceContent,
                        job.language,
                        job.writing_style || 'professional',
                        supabase
                    );

                    // Migrate image to Cloudinary
                    let imageUrl = '';
                    if (item.thumbnail) {
                        try {
                            imageUrl = await migrateImageToCloudinary(item.thumbnail);
                        } catch (imgErr: any) {
                            console.error(`Gagal mengunggah thumbnail ke Cloudinary: ${imgErr.message}`);
                            imageUrl = item.thumbnail; // fallback
                        }
                    }

                    // Append source URL as hidden HTML comment for duplicate detection
                    const finalContent = `${rewritten.content}\n\n<!-- rss_source_link: ${item.link} -->`;
                    const baseSlug = slugify(rewritten.title);
                    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

                    // Save
                    const { error: insertErr } = await supabase
                        .from('articles')
                        .insert({
                            title: rewritten.title,
                            slug: uniqueSlug,
                            excerpt: rewritten.excerpt,
                            content: finalContent,
                            category_id: job.category_id,
                            featured_image: imageUrl,
                            is_premium: false,
                            is_published: job.is_published,
                            product_placement: 'after',
                            focus_keyword: rewritten.focusKeyword,
                            author_id: authorId
                        });

                    if (insertErr) {
                        log.push(`  - Error menyimpan database: ${insertErr.message}`);
                    } else {
                        log.push(`  - Sukses mengimport: ${rewritten.title}`);
                        totalImported++;
                    }
                }

                // Update job last_run timestamp
                await supabase
                    .from('rss_jobs')
                    .update({ last_run: new Date().toISOString() })
                    .eq('id', job.id);

            } catch (jobErr: any) {
                log.push(`- Error memproses job: ${jobErr.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            totalImported,
            log
        });

    } catch (error: any) {
        console.error('[Cron Job Error]:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan sistem.' },
            { status: 500 }
        );
    }
}
export const runtime = 'edge';
