'use client';

import { useState, useEffect } from 'react';
import { 
    Sparkles, 
    Search, 
    Loader2, 
    Check, 
    AlertCircle, 
    BookOpen, 
    ExternalLink, 
    Play, 
    TrendingUp, 
    FileText 
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Hot Trending Keywords Presets in Indonesia
const TRENDING_PRESETS = [
    { label: '🔥 Viral Terbaru', query: 'viral indonesia terbaru' },
    { label: '💻 Teknologi & Gadget', query: 'teknologi gadget terbaru' },
    { label: '⚽ Olahraga & Bola', query: 'sepatu sepak bola olahraga' },
    { label: '🎭 Hiburan & Artis', query: 'gosip artis hiburan film' },
    { label: '📈 Bisnis & Saham', query: 'ekonomi bisnis investasi saham' },
];

const WRITING_STYLES = [
    { code: 'professional', name: '👔 Professional / Jurnalistik', desc: 'Gaya formal dan netral seperti portal berita utama.' },
    { code: 'casual', name: '☕ Casual / Santai', desc: 'Gaya tulisan blog yang ramah, hangat, dan interaktif.' },
    { code: 'clickbait', name: '⚡ Clickbait / Sensasional', desc: 'Judul memancing rasa ingin tahu, bombastis, dan seru.' },
    { code: 'investigative', name: '🔍 Investigative / Mendalam', desc: 'Investigasi penuh fakta mendalam dan analisis berbobot.' },
];

const LANGUAGES = [
    { code: 'id', name: '🇮🇩 Bahasa Indonesia' },
    { code: 'en', name: '🇺🇸 English' },
    { code: 'ms', name: '🇲🇾 Bahasa Melayu' },
    { code: 'es', name: '🇪🇸 Español (Spanish)' },
    { code: 'ar', name: '🇸🇦 العربية (Arabic)' },
    { code: 'ja', name: '🇯🇵 日本語 (Japanese)' },
    { code: 'zh', name: '🇨🇳 中文 (Chinese)' },
];

interface RSSFeedItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    thumbnail: string;
}

export default function ViralGeneratorPage() {
    const supabase = createClient();

    // Query states
    const [searchQuery, setSearchQuery] = useState('indonesia hari ini');
    const [selectedStyle, setSelectedStyle] = useState('professional');
    const [selectedLanguage, setSelectedLanguage] = useState('id');
    const [categoryId, setCategoryId] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    // Data states
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<RSSFeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Processing states
    const [processingItem, setProcessingItem] = useState<string | null>(null);
    const [processStep, setProcessStep] = useState('');
    const [importedLinks, setImportedLinks] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCategories();
        handleSearch('indonesia hari ini');
    }, []);

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) {
            setCategories(data);
            if (data.length > 0) setCategoryId(data[0].id);
        }
    }

    async function handleSearch(queryToUse?: string) {
        const query = queryToUse || searchQuery;
        if (!query) {
            setStatus({ type: 'error', message: 'Tolong masukkan topik pencarian terlebih dahulu.' });
            return;
        }

        try {
            setLoading(true);
            setStatus(null);
            setItems([]);

            // Construct Google News search RSS URL
            const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
            
            const response = await fetch(`/api/admin/rss/fetch?url=${encodeURIComponent(googleNewsUrl)}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Gagal memuat berita viral.');
            }

            setItems(data.feed.items || []);
            setStatus({ type: 'success', message: `Menampilkan ${data.feed.items.length} berita hangat tentang "${query}"` });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal mencari berita dari Google News.' });
        } finally {
            setLoading(false);
        }
    }

    async function handleImportItem(item: RSSFeedItem) {
        if (!categoryId) {
            setStatus({ type: 'error', message: 'Pilih kategori terlebih dahulu.' });
            return;
        }

        try {
            setProcessingItem(item.link);
            setStatus(null);

            setProcessStep('1. Scraping isi berita dari penerbit asli...');
            await new Promise(r => setTimeout(r, 600));

            setProcessStep(`2. Menulis ulang dengan AI (${WRITING_STYLES.find(s => s.code === selectedStyle)?.name})...`);
            await new Promise(r => setTimeout(r, 600));

            setProcessStep('3. Mengunggah gambar & Menyimpan artikel...');
            
            const response = await fetch('/api/admin/rss/rewrite-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: item.title,
                    link: item.link,
                    description: item.description,
                    thumbnail: item.thumbnail,
                    categoryId,
                    language: selectedLanguage,
                    isPublished,
                    writingStyle: selectedStyle
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Gagal membuat berita.');
            }

            setImportedLinks(prev => new Set([...prev, item.link]));
            setStatus({ 
                type: 'success', 
                message: `Sukses membuat berita baru: "${data.article.title}"` 
            });

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Gagal memproses berita.' });
        } finally {
            setProcessingItem(null);
            setProcessStep('');
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                        <span>Google News Viral Generator</span>
                    </h1>
                    <p className="text-gray-500 text-sm">Cari topik terhangat di Google News dan buat artikel unik berkualitas tinggi secara instan.</p>
                </div>
            </div>

            {/* Status notification */}
            {status && (
                <div className={`p-4 rounded-2xl border flex items-center space-x-3 transition-all ${
                    status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {status.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <p className="text-sm font-bold">{status.message}</p>
                </div>
            )}

            {/* Keyword Search & Presets Panel */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Cari topik hangat... (contoh: Timnas U23, peluncuran ios 18, gempa bandung)"
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-gray-800"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="bg-black hover:bg-gray-800 text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        <span>Cari Topik</span>
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Topik Panas:</span>
                    {TRENDING_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                setSearchQuery(preset.query);
                                handleSearch(preset.query);
                            }}
                            className="bg-slate-50 hover:bg-slate-100 text-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <span>Konfigurasi AI Writer</span>
                        </h3>

                        {/* Writing Style */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Gaya Penulisan Berita</label>
                            <div className="relative">
                                <select
                                    value={selectedStyle}
                                    onChange={(e) => setSelectedStyle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold cursor-pointer"
                                >
                                    {WRITING_STYLES.map((style) => (
                                        <option key={style.code} value={style.code}>
                                            {style.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">
                                {WRITING_STYLES.find(s => s.code === selectedStyle)?.desc}
                            </p>
                        </div>

                        {/* Destination Category */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Kategori Artikel</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            >
                                <option value="">Pilih Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Target Language */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Bahasa Terjemahan AI</label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Immediate Publish */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold">Publikasikan Langsung</p>
                                <p className="text-[10px] text-gray-500">Aktifkan untuk memposting langsung tanpa tersimpan di konsep</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* News Search Results */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-purple-600" />
                                <span>Hasil Google News</span>
                            </h3>
                            <span className="bg-slate-50 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                                {items.length} Topik Ditemukan
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
                                <FileText className="w-12 h-12 text-gray-200" />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-gray-500">Belum ada topik.</p>
                                    <p className="text-xs text-gray-400">Gunakan kolom pencarian di atas untuk memuat data Google News.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {items.map((item, idx) => {
                                    const isProcessing = processingItem === item.link;
                                    const isImported = importedLinks.has(item.link);

                                    return (
                                        <div key={idx} className="py-5 flex flex-col md:flex-row gap-4 items-start group">
                                            {item.thumbnail ? (
                                                <div className="w-full md:w-32 aspect-video md:aspect-square rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 relative">
                                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-full md:w-32 aspect-video md:aspect-square rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 text-gray-300">
                                                    <TrendingUp className="w-8 h-8" />
                                                </div>
                                            )}

                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        {item.pubDate ? new Date(item.pubDate).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        }) : 'Hari Ini'}
                                                    </span>
                                                    <a 
                                                        href={item.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>

                                                <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors leading-snug">
                                                    {item.title}
                                                </h4>

                                                {item.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="shrink-0 pt-2 w-full md:w-auto">
                                                {isImported ? (
                                                    <div className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 w-full md:w-auto">
                                                        <Check className="w-4 h-4" />
                                                        <span>Di-import</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleImportItem(item)}
                                                        disabled={!!processingItem}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg w-full md:w-auto disabled:opacity-50"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                <span className="text-[10px]">{processStep || 'Memproses...'}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                                                                <span>AI Rewrite & Generate</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
