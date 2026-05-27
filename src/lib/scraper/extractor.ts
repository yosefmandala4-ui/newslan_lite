/**
 * Simple HTML content scraper designed to extract article body text from external links.
 * Works entirely on Cloudflare Pages (Edge environment).
 */

export interface ExtractedArticle {
    title: string;
    content: string;
    excerpt: string;
}

export async function extractArticleContent(url: string): Promise<ExtractedArticle> {
    try {
        // Fetch target article page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch article page: ${response.statusText}`);
        }

        const html = await response.text();

        // 1. Extract Page Title
        const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
        const titleMatch = html.match(titleRegex);
        let title = titleMatch ? titleMatch[1].split(/[|-]/)[0].trim() : 'Artikel';
        // Clean title entities
        title = title
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'");

        // 2. Clean HTML - remove script, style, header, footer, nav, ads, aside
        let cleanHtml = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
            .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

        // 3. Extract all paragraph tags content
        const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        const paragraphs: string[] = [];
        let pMatch;

        while ((pMatch = pRegex.exec(cleanHtml)) !== null) {
            const pContent = pMatch[1]
                .replace(/<[^>]*>/g, '') // remove inner tags
                .replace(/\s+/g, ' ') // normalize spaces
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .trim();

            // Only add paragraphs that look like actual article content (longer than 25 chars)
            if (pContent.length > 25) {
                // Ignore common newsletter signups or privacy policy links
                const lowerText = pContent.toLowerCase();
                if (
                    !lowerText.includes('cookie') &&
                    !lowerText.includes('privacy policy') &&
                    !lowerText.includes('kebijakan privasi') &&
                    !lowerText.includes('baca juga') &&
                    !lowerText.includes('subscribe') &&
                    !lowerText.includes('langganan')
                ) {
                    paragraphs.push(pContent);
                }
            }
        }

        const content = paragraphs.join('\n\n');
        const excerpt = paragraphs.length > 0 
            ? (paragraphs[0].substring(0, 160) + '...')
            : '';

        return {
            title,
            content: content || 'Konten tidak dapat diekstrak otomatis.',
            excerpt
        };
    } catch (error: any) {
        console.error('[Extractor Error]:', error.message);
        return {
            title: '',
            content: '',
            excerpt: ''
        };
    }
}
