/**
 * Lightweight, zero-dependency RSS Feed Parser designed for Cloudflare Pages/Workers.
 * Avoids browser-only DOMParser and heavy/incompatible Node.js XML libraries.
 */

export interface RSSItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    thumbnail: string;
}

export interface RSSFeed {
    title: string;
    description: string;
    link: string;
    items: RSSItem[];
}

function cleanCdata(text: string): string {
    if (!text) return '';
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
}

function extractTagContent(xml: string, tag: string): string {
    // Matches tags like <title>content</title> or <title type="...">content</title>
    const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? cleanCdata(match[1]) : '';
}

function extractAttribute(tagString: string, attrName: string): string {
    const regex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
    const match = tagString.match(regex);
    return match ? match[1] : '';
}

/**
 * Extracts thumbnail from RSS item description HTML
 */
function extractImageFromHtml(html: string): string {
    if (!html) return '';
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = html.match(imgRegex);
    return match ? match[1] : '';
}

export async function parseRSS(url: string): Promise<RSSFeed> {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${res.statusText}`);
    }

    const xmlText = await res.text();

    // Extract channel info
    const channelTitle = extractTagContent(xmlText, 'title');
    const channelDesc = extractTagContent(xmlText, 'description');
    const channelLink = extractTagContent(xmlText, 'link');

    // Split items
    const items: RSSItem[] = [];
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1];
        
        const title = extractTagContent(itemXml, 'title');
        let link = extractTagContent(itemXml, 'link');
        const pubDate = extractTagContent(itemXml, 'pubDate') || extractTagContent(itemXml, 'dc:date') || extractTagContent(itemXml, 'updated');
        const description = extractTagContent(itemXml, 'description') || extractTagContent(itemXml, 'summary') || extractTagContent(itemXml, 'content:encoded');

        // Google News link redirects sometimes, link is parsed directly
        // Fallback for relative or malformed link tags
        if (!link && itemXml.includes('link="')) {
            link = extractAttribute(itemXml, 'link');
        }

        // Try extracting thumbnail URL from multiple standard feeds patterns:
        let thumbnail = '';

        // 1. Check for media:content
        const mediaContentRegex = /<(?:media:content|content)\b([^>]*)/i;
        const mediaContentMatch = itemXml.match(mediaContentRegex);
        if (mediaContentMatch) {
            const attrs = mediaContentMatch[1];
            const medium = extractAttribute(attrs, 'medium');
            const type = extractAttribute(attrs, 'type');
            if (medium === 'image' || type.startsWith('image/') || attrs.includes('url=')) {
                thumbnail = extractAttribute(attrs, 'url');
            }
        }

        // 2. Check for media:thumbnail
        if (!thumbnail) {
            const mediaThumbRegex = /<(?:media:thumbnail|thumbnail)\b([^>]*)/i;
            const mediaThumbMatch = itemXml.match(mediaThumbRegex);
            if (mediaThumbMatch) {
                thumbnail = extractAttribute(mediaThumbMatch[1], 'url');
            }
        }

        // 3. Check for enclosure
        if (!thumbnail) {
            const enclosureRegex = /<enclosure\b([^>]*)/i;
            const enclosureMatch = itemXml.match(enclosureRegex);
            if (enclosureMatch) {
                const attrs = enclosureMatch[1];
                const type = extractAttribute(attrs, 'type');
                if (type.startsWith('image/')) {
                    thumbnail = extractAttribute(attrs, 'url');
                }
            }
        }

        // 4. Try extracting from description/summary HTML img tags
        if (!thumbnail) {
            thumbnail = extractImageFromHtml(description);
        }

        items.push({
            title: title || 'Tanpa Judul',
            link: link || '',
            pubDate: pubDate || new Date().toISOString(),
            description: description ? description.replace(/<[^>]*>/g, '').substring(0, 180) + '...' : '',
            thumbnail: thumbnail || ''
        });
    }

    return {
        title: channelTitle || 'RSS Feed',
        description: channelDesc || '',
        link: channelLink || url,
        items
    };
}
