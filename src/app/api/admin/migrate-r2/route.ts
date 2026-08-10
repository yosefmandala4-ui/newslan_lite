import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { migrateImageToR2 } from '@/app/actions/wordpress-import';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Basic admin check (adjust based on your exact admin logic)
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only process 5-10 at a time to prevent server timeout
        const BATCH_SIZE = 5;

        // Find articles with Cloudinary URLs
        const { data: articles, error: fetchError } = await supabase
            .from('articles')
            .select('id, title, featured_image')
            .like('featured_image', '%res.cloudinary.com%')
            .limit(BATCH_SIZE);

        if (fetchError) throw fetchError;

        if (!articles || articles.length === 0) {
            return NextResponse.json({ message: 'No more articles with Cloudinary images found.' });
        }

        const log: string[] = [];
        let successCount = 0;

        for (const article of articles) {
            if (!article.featured_image) continue;

            log.push(`Migrating: ${article.title}`);
            try {
                // Upload to R2
                const newUrl = await migrateImageToR2(article.featured_image);

                // Update Database
                const { error: updateError } = await supabase
                    .from('articles')
                    .update({ featured_image: newUrl })
                    .eq('id', article.id);

                if (updateError) {
                    log.push(`  ❌ Failed to update DB: ${updateError.message}`);
                } else {
                    log.push(`  ✅ Success: ${newUrl}`);
                    successCount++;
                }
            } catch (err: any) {
                log.push(`  ❌ Failed to migrate image: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: `Migrated ${successCount}/${articles.length} articles in this batch.`,
            log,
            hasMore: articles.length === BATCH_SIZE
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
