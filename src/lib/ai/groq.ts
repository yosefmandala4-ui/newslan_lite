import { getSiteSettings } from '../settings';

export interface RewriteResult {
    title: string;
    excerpt: string;
    content: string;
    focusKeyword: string;
}

export async function rewriteArticle(
    originalTitle: string,
    originalContent: string,
    targetLanguage: string,
    writingStyle = 'professional',
    supabaseClient?: any
): Promise<RewriteResult> {
    // 1. Fetch settings to get Groq API Key
    const settings = await getSiteSettings(supabaseClient);
    const apiKey = settings.groq_api_key || process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('Groq API Key tidak ditemukan. Harap konfigurasi di menu Pengaturan Website -> AI Autowriter Settings.');
    }

    // Language code map to full name
    const langMap: Record<string, string> = {
        'id': 'Bahasa Indonesia',
        'en': 'English (United States)',
        'ms': 'Bahasa Melayu',
        'es': 'Español (Spanish)',
        'ar': 'العربية (Arabic)',
        'ja': '日本語 (Japanese)',
        'zh': '中文 (Chinese)',
    };

    const targetLangName = langMap[targetLanguage] || 'Bahasa Indonesia';

    // Tailor style directions based on style chosen
    let toneInstruction = 'Informative, authoritative, engaging, and professional news tone.';
    if (writingStyle === 'casual') {
        toneInstruction = 'Friendly, warm, conversational, and easy to read. Use everyday language, popular terms, and an interactive tone. Write like a friendly blogger.';
    } else if (writingStyle === 'clickbait') {
        toneInstruction = 'Highly sensational and dramatic. Make the title extremely click-worthy, creating a curiosity gap or emotional hooks. Keep readers highly engaged and curious.';
    } else if (writingStyle === 'investigative') {
        toneInstruction = 'Highly detailed, analytical, unpacking facts step-by-step. Focus on details, analysis, quotes explanation, and present it in an investigative reporting tone.';
    }

    const systemPrompt = `You are a professional editor and SEO expert. 
Your task is to completely rewrite, localize, expand, and restructure the user's article into a fresh, unique, engaging, and plagiarism-free version.

Rules:
1. Target Language: The entire rewritten output MUST be written in "${targetLangName}".
2. Output format: You must return a JSON object with the following fields:
   - "title": A catchy, click-worthy, SEO-optimized title for the article.
   - "excerpt": A concise, engaging 1-2 sentence summary of the article (plain text, no HTML).
   - "content": The complete detailed article body. You must structure it with clean, semantically correct HTML tags like <p>, <h2>, <h3>. Do NOT use markdown (*, #, etc.) inside this field, use HTML tags.
   - "focusKeyword": A single strong SEO focus keyword or keyphrase (e.g. "harga iphone 15 pro") for the article.
3. Tone & Writing Style: ${toneInstruction}
4. Plagiarism-Free: Restructure sentences, use synonyms, and change the phrasing entirely while preserving the facts. Do not copy sentences verbatim.
5. Length & Depth: The rewritten article must be highly detailed and comprehensive. Do NOT summarize or shorten the content. Aim to match or exceed the length of the original text (up to 1500 words). Each paragraph (<p>) must be rich, well-developed, and contain at least 3-5 sentences. Avoid thin, one-sentence paragraphs.`;

    const userPrompt = `Original Title: ${originalTitle}
Original Content:
${originalContent || 'No content provided.'}`;

    const modelName = 'llama-3.3-70b-versatile';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Groq API Error]:', errorText);
        throw new Error(`Groq API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) {
        throw new Error('Groq AI returned an empty response.');
    }

    try {
        const parsed = JSON.parse(resultText) as RewriteResult;
        return {
            title: parsed.title || originalTitle,
            excerpt: parsed.excerpt || '',
            content: parsed.content || '',
            focusKeyword: parsed.focusKeyword || '',
        };
    } catch (e) {
        console.error('[JSON Parse Error on AI Output]:', resultText, e);
        throw new Error('Gagal memproses hasil respon AI dalam format JSON.');
    }
}
