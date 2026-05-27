'use client';

import { useState, useEffect } from 'react';
import { 
    Rss, 
    Globe, 
    Sparkles, 
    ArrowLeft, 
    Loader2, 
    Check, 
    AlertCircle, 
    ExternalLink, 
    FolderPlus, 
    Cpu, 
    BookOpen,
    Send,
    Play
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// RSS Feed Presets
const PRESET_FEEDS = [
    { name: 'Google News Indonesia', url: 'https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id' },
    { name: 'Antara News Terkini', url: 'https://www.antaranews.com/rss/terkini.xml' },
    { name: 'Republika Terkini', url: 'https://www.republika.co.id/rss' },
    { name: 'TechCrunch (Tech)', url: 'https://techcrunch.com/feed/' },
    { name: 'BBC News (Dunia)', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
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

export default function RSSGrabberPage() {
    const supabase = createClient();

    // Configuration state
    const [feedUrl, setFeedUrl] = useState(PRESET_FEEDS[0].url);
    const [selectedLanguage, setSelectedLanguage] = useState('id');
    const [selectedStyle, setSelectedStyle] = useState('professional');
    const [categoryId, setCategoryId] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [feedItems, setFeedItems] = useState<RSSFeedItem[]>([]);
    const [feedTitle, setFeedTitle] = useState('');
    
    // Status/Message state
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Track active processing for each feed item link
    const [processingItem, setProcessingItem] = useState<string | null>(null);
    const [processStep, setProcessStep] = useState<string>('');
    const [importedLinks, setImportedLinks] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) {
            setCategories(data);
            if (data.length > 0) setCategoryId(data[0].id);
        }
    }

    async function handleFetchFeed() {
        if (!feedUrl) {
            setStatus({ type: 'error', message: 'Tolong masukkan URL RSS terlebih dahulu.' });
            return;
        }

        try {
            setLoadingFeed(true);
            setStatus(null);
            setFeedItems([]);

            const response = await fetch(`/api/admin/rss/fetch?url=${encodeURIComponent(feedUrl)}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Gagal memproses feed RSS.');
            }

            setFeedItems(data.feed.items || []);
            setFeedTitle(data.feed.title || 'Feed RSS');
            setStatus({ type: 'success', message: `Berhasil memuat ${data.feed.items.length} artikel dari feed.` });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan saat memuat feed.' });
        } finally {
            setLoadingFeed(false);
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

            setProcessStep('1. Mengambil konten artikel asli...');
            // Wait brief moment for UX
            await new Promise(r => setTimeout(r, 600));

            setProcessStep('2. Menulis ulang & Menerjemahkan dengan Groq AI...');
            await new Promise(r => setTimeout(r, 600));

            setProcessStep('3. Mengunggah gambar ke Cloudinary & Database...');
            
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
                throw new Error(data.error || 'Gagal melakukan rewrite & import.');
            }

            // Add to imported links set
            setImportedLinks(prev => new Set([...prev, item.link]));
            setStatus({ 
                type: 'success', 
                message: `Berhasil mengimpor "${data.article.title}" sebagai ${isPublished ? 'Publik' : 'Konsep'}!` 
            });

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Terjadi kesalahan saat mengimpor.' });
        } finally {
            setProcessingItem(null);
            setProcessStep('');
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/articles" className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                            <Rss className="w-8 h-8 text-[#990000]" />
                            <span>RSS AI Grabber & Rewriter</span>
                        </h1>
                        <p className="text-gray-500 text-sm">Ambil artikel dari feed RSS dan rewrite otomatis menggunakan Groq AI ke bahasa tujuan.</p>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className={`p-4 rounded-2xl border flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-top-2 ${
                    status.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {status.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <p className="text-sm font-bold">{status.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-indigo-500" />
                            <span>Konfigurasi Grabber</span>
                        </h3>

                        {/* RSS Feed Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">URL Feed RSS</label>
                            <input
                                type="text"
                                value={feedUrl}
                                onChange={(e) => setFeedUrl(e.target.value)}
                                placeholder="https://domain.com/rss.xml"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-mono"
                            />
                        </div>

                        {/* Presets */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Pilih Preset Feed</label>
                            <div className="flex flex-wrap gap-1.5">
                                {PRESET_FEEDS.map((feed) => (
                                    <button
                                        key={feed.name}
                                        onClick={() => setFeedUrl(feed.url)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                            feedUrl === feed.url 
                                                ? 'bg-black text-white border-black' 
                                                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        {feed.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Gaya Penulisan */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Gaya Penulisan</label>
                            <select
                                value={selectedStyle}
                                onChange={(e) => setSelectedStyle(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold cursor-pointer"
                            >
                                <option value="professional">👔 Professional / Jurnalistik</option>
                                <option value="casual">☕ Casual / Santai</option>
                                <option value="clickbait">⚡ Clickbait / Sensasional</option>
                                <option value="investigative">🔍 Investigative / Mendalam</option>
                            </select>
                        </div>

                        {/* Target Language Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Bahasa Tujuan AI</label>
                            <div className="relative">
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm appearance-none cursor-pointer font-bold"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Target Category Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Kategori Artikel Baru</label>
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

                        {/* Publish toggle */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold">Publikasikan Langsung</p>
                                <p className="text-[10px] text-gray-500">Aktifkan untuk mempublikasikan artikel secara langsung (bukan konsep)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#990000]"></div>
                            </label>
                        </div>

                        {/* Load Feed Button */}
                        <button
                            onClick={handleFetchFeed}
                            disabled={loadingFeed || !!processingItem}
                            className="w-full bg-[#990000] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-[#800000] transition-all shadow-lg shadow-[#990000]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingFeed ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                            <span>{loadingFeed ? 'Membaca Feed...' : 'Fetch Feed RSS'}</span>
                        </button>
                    </div>
                </div>

                {/* Feed Items List */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#990000]" />
                                <span>{feedTitle || 'Hasil RSS Feed'}</span>
                            </h3>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                {feedItems.length} Artikel Ditemukan
                            </span>
                        </div>

                        {feedItems.length === 0 ? (
                            <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
                                <Rss className="w-12 h-12 text-gray-200" />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-gray-500">Belum ada data feed RSS.</p>
                                    <p className="text-xs text-gray-400">Klik tombol "Fetch Feed RSS" untuk memuat daftar berita.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {feedItems.map((item, idx) => {
                                    const isProcessing = processingItem === item.link;
                                    const isImported = importedLinks.has(item.link);

                                    return (
                                        <div key={idx} className="py-6 flex flex-col md:flex-row gap-4 items-start group">
                                            {/* Thumbnail Section */}
                                            {item.thumbnail ? (
                                                <div className="w-full md:w-32 aspect-video md:aspect-square rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100 relative">
                                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-full md:w-32 aspect-video md:aspect-square rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 text-gray-300">
                                                    <Rss className="w-8 h-8" />
                                                </div>
                                            )}

                                            {/* Title & Excerpt Content */}
                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        {item.pubDate ? new Date(item.pubDate).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        }) : 'Baru'}
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

                                                <h4 className="font-bold text-gray-900 group-hover:text-[#990000] transition-colors leading-snug">
                                                    {item.title}
                                                </h4>

                                                {item.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Button */}
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
                                                        className="bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg w-full md:w-auto disabled:opacity-50"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                <span className="text-[10px]">{processStep || 'Memproses...'}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                                                                <span>AI Rewrite & Import</span>
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
