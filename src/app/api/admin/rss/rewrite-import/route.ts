import { NextRequest, NextResponse } from 'next/server';
import { extractArticleContent } from '@/lib/scraper/extractor';
import { rewriteArticle } from '@/lib/ai/groq';
import { migrateImageToCloudinary } from '@/app/actions/wordpress-import';
import { createClient } from '@/lib/supabase/server';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate request
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Harap login kembali.' },
                { status: 401 }
            );
        }

        // 2. Parse body parameters
        const body = await request.json();
        const { title, link, description, thumbnail, categoryId, language, isPublished, writingStyle } = body;

        if (!title || !link || !categoryId || !language) {
            return NextResponse.json(
                { success: false, error: 'Parameter title, link, categoryId, dan language wajib diisi.' },
                { status: 400 }
            );
        }

        // 3. Extract full article content from target URL
        console.log(`[RSS Import] Extracting content from: ${link}`);
        const extracted = await extractArticleContent(link);
        const sourceContent = extracted.content || description || 'Tidak ada deskripsi konten.';

        // 4. Rewrite using Groq AI
        console.log(`[RSS Import] Rewriting article with Groq AI in language: ${language}, style: ${writingStyle || 'professional'}`);
        const rewriteResult = await rewriteArticle(
            extracted.title || title,
            sourceContent,
            language,
            writingStyle || 'professional',
            supabase
        );

        // 5. Migrate image to Cloudinary (if present)
        let featuredImage = '';
        if (thumbnail) {
            try {
                console.log(`[RSS Import] Migrating thumbnail to Cloudinary: ${thumbnail}`);
                featuredImage = await migrateImageToCloudinary(thumbnail);
            } catch (err: any) {
                console.error('[RSS Import] Failed to upload image to Cloudinary, fallback to original:', err.message);
                featuredImage = thumbnail;
            }
        }

        // 6. Save article in Supabase
        const finalTitle = rewriteResult.title;
        const baseSlug = slugify(finalTitle);
        // Add random suffix to avoid slug duplication collisions
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

        console.log('[RSS Import] Inserting article into Supabase');
        const { data: article, error: dbError } = await supabase
            .from('articles')
            .insert({
                title: finalTitle,
                slug: uniqueSlug,
                excerpt: rewriteResult.excerpt,
                content: rewriteResult.content,
                category_id: categoryId,
                featured_image: featuredImage,
                is_premium: false,
                is_published: !!isPublished,
                product_placement: 'after',
                focus_keyword: rewriteResult.focusKeyword,
                author_id: user.id
            })
            .select()
            .single();

        if (dbError) {
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: 'Artikel berhasil di-rewrite dan di-import!',
            article
        });

    } catch (error: any) {
        console.error('[RSS Import API Error]:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Gagal meng-import artikel.' },
            { status: 500 }
        );
    }
}
export const runtime = 'edge';
