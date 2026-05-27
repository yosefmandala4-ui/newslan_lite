'use client';

import BannerSlider from '@/components/ui/BannerSlider';
import { Pagination } from '@/components/ui/Pagination';
import { optimizeCloudinaryUrl } from '@/lib/utils';
import { Calendar, Eye, User, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface TemplateProps {
    banners: any[]
    latestArticles: any[]
    categoriesWithNews: any[]
    breakingNews: any[]
    feedAds: any[]
    latestGridNews: any[]
    totalLatestNews: number
    trendingNews: any[]
    currentPage: number
    totalPages: number
    sidebarAds: any[]
}

const DEFAULT_NEWS_IMAGE = 'https://images.unsplash.com/photo-1585829365234-78d2b94a6d50?q=80&w=800&auto=format&fit=crop';

export default function TemplateNewspaper({
    banners,
    latestArticles,
    categoriesWithNews,
    breakingNews,
    feedAds,
    latestGridNews,
    totalLatestNews,
    trendingNews,
    currentPage,
    totalPages,
    sidebarAds
}: TemplateProps) {

    const mainStory = latestArticles?.[0];
    const secondaryStories = latestArticles?.slice(1, 4) || [];
    const rightStories = latestArticles?.slice(4, 9) || [];

    return (
        <div className="flex flex-col bg-[#FDFCF7] min-h-screen text-[#1A1A1A] font-serif antialiased pb-20 selection:bg-black selection:text-white">
            
            {/* Double Border Premium Classic Header Banner */}
            {currentPage === 1 && (
                <div className="max-w-7xl mx-auto w-full px-4 pt-8 pb-4 text-center border-b-4 border-double border-black/80">
                    <span className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-[#990000]">
                        EDISI TERBARU • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-2 mb-3 font-serif font-black select-none uppercase hover:opacity-90 transition-opacity">
                        THE NEWSLAN GAZETTE
                    </h1>
                    <p className="text-xs font-sans text-gray-500 italic max-w-md mx-auto">
                        "Jurnalisme Terpercaya, Cerdas, dan Mendalam Secara Real-Time"
                    </p>
                </div>
            )}

            {currentPage === 1 && banners && banners.length > 0 && (
                <div className="max-w-7xl mx-auto w-full px-4 mt-6">
                    <BannerSlider banners={banners} />
                </div>
            )}

            {/* Main Newspaper Grid */}
            {currentPage === 1 && (
                <section className="py-8 max-w-7xl mx-auto w-full px-4 border-b border-black/20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* LEFT COLUMN: Main Feature Story (Col-span 6) */}
                        <div className="lg:col-span-6 space-y-4 lg:border-r lg:border-black/10 lg:pr-8">
                            {mainStory && (
                                <div className="group space-y-4">
                                    <div className="relative aspect-[16/10] w-full overflow-hidden border border-black/10 bg-slate-50">
                                        <Image
                                            src={optimizeCloudinaryUrl(mainStory.featured_image || DEFAULT_NEWS_IMAGE)}
                                            alt={mainStory.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            priority
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-[10px] font-sans font-black uppercase tracking-widest text-[#990000] border border-[#990000] px-2 py-0.5">
                                                {mainStory.categories?.name || 'FEATURED'}
                                            </span>
                                            <span className="text-[10px] font-sans text-gray-400 font-bold uppercase tracking-wider">
                                                {new Date(mainStory.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <Link href={`/news/${mainStory.slug}`}>
                                            <h2 className="text-2xl md:text-4xl font-black leading-tight hover:text-[#990000] hover:underline underline-offset-4 transition-colors font-serif tracking-tight">
                                                {mainStory.title}
                                            </h2>
                                        </Link>
                                        <p className="text-gray-600 text-sm leading-relaxed font-sans line-clamp-3">
                                            {mainStory.excerpt || 'Baca selengkapnya mengenai berita utama hari ini.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Secondary items in left column */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-black/10">
                                {secondaryStories.map((story) => (
                                    <div key={story.id} className="group space-y-3">
                                        <div className="relative aspect-video w-full overflow-hidden border border-black/5 bg-slate-100">
                                            <Image
                                                src={optimizeCloudinaryUrl(story.featured_image || DEFAULT_NEWS_IMAGE)}
                                                alt={story.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                sizes="250px"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-gray-400 block">
                                                {story.categories?.name}
                                            </span>
                                            <Link href={`/news/${story.slug}`}>
                                                <h3 className="text-sm font-bold leading-snug hover:text-[#990000] hover:underline transition-colors line-clamp-3">
                                                    {story.title}
                                                </h3>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CENTER COLUMN: Opinion & Trends List (Col-span 3) */}
                        <div className="lg:col-span-3 space-y-6 lg:border-r lg:border-black/10 lg:pr-8">
                            <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] text-gray-400 border-b border-black pb-2">
                                OPINI & TREN
                            </h3>
                            <div className="divide-y divide-black/10">
                                {rightStories.map((story, index) => (
                                    <div key={story.id} className="py-4 first:pt-0 last:pb-0 group space-y-2">
                                        <div className="flex items-center space-x-1.5 text-[9px] font-sans text-gray-400 font-bold uppercase">
                                            <span className="text-[#990000] font-black font-sans">#0{index + 1}</span>
                                            <span>•</span>
                                            <span>{story.categories?.name}</span>
                                        </div>
                                        <Link href={`/news/${story.slug}`}>
                                            <h4 className="text-sm font-black leading-snug hover:text-[#990000] hover:underline transition-colors line-clamp-3">
                                                {story.title}
                                            </h4>
                                        </Link>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed font-sans">
                                            {story.excerpt}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Sidebar Ads & Widgets (Col-span 3) */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="bg-white border border-black/10 p-6 space-y-4">
                                <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] border-b border-black pb-2 flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-[#990000]" />
                                    <span>TENTANG KAMI</span>
                                </h3>
                                <p className="text-xs font-sans text-gray-500 leading-relaxed">
                                    The Newslan Gazette menyajikan jurnalisme berkualitas tinggi dengan kurasi opini, analisis pasar, dan penulisan ulang berbasis AI terpercaya.
                                </p>
                            </div>

                            {/* Sidebar Ad placement */}
                            {sidebarAds && sidebarAds.length > 0 && (
                                <div className="space-y-4">
                                    <span className="text-[9px] font-sans font-black text-gray-400 uppercase tracking-widest text-center block">ADVERTISEMENT</span>
                                    <div className="border border-black/10 p-2 bg-white flex justify-center">
                                        {/* Simple Image/Ad renderer */}
                                        <a href={sidebarAds[0].target_url} target="_blank" rel="noopener noreferrer" className="block w-full text-center">
                                            <img src={sidebarAds[0].image_url} alt="" className="mx-auto max-h-[300px] object-contain" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Dynamic Categorized Editorial Blocks */}
            {currentPage === 1 && (
                <section className="py-12 max-w-7xl mx-auto w-full px-4">
                    <div className="space-y-16">
                        {categoriesWithNews?.slice(0, 3).map((section) => (
                            <div key={section.id} className="border-b border-black/10 pb-12 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-8">
                                    <h2 className="text-2xl font-black uppercase tracking-tight font-serif">{section.name}</h2>
                                    <Link href={`/category/${section.slug}`} className="text-[10px] font-sans font-black text-gray-400 hover:text-[#990000] transition-colors tracking-widest uppercase">
                                        LIHAT SEMUA →
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {(section.articles as any[] || []).slice(0, 3).map((article) => (
                                        <div key={article.id} className="group space-y-4">
                                            <div className="relative aspect-[16/10] w-full overflow-hidden border border-black/5 bg-slate-50">
                                                <Image
                                                    src={optimizeCloudinaryUrl(article.featured_image || DEFAULT_NEWS_IMAGE)}
                                                    alt={article.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-sans font-black text-[#990000] uppercase tracking-wider block">
                                                    {section.name}
                                                </span>
                                                <Link href={`/news/${article.slug}`}>
                                                    <h3 className="text-lg font-black leading-snug hover:text-[#990000] hover:underline transition-colors line-clamp-2">
                                                        {article.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-gray-500 text-xs font-sans leading-relaxed line-clamp-2">
                                                    {article.excerpt}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Standard Paginated Feed */}
            <section className="py-12 bg-white border-t border-black/10">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-2xl font-black uppercase text-center tracking-tight border-b-2 border-black pb-3 mb-10">
                        REKOMENDASI BERITA
                    </h2>
                    
                    <div className="divide-y divide-black/10">
                        {latestGridNews?.map((article) => (
                            <div key={article.id} className="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row gap-6 items-center group">
                                <div className="relative w-full md:w-44 aspect-video overflow-hidden border border-black/5 bg-slate-50 shrink-0">
                                    <Image
                                        src={optimizeCloudinaryUrl(article.featured_image || DEFAULT_NEWS_IMAGE)}
                                        alt={article.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 768px) 100vw, 176px"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2 text-[10px] font-sans font-black text-[#990000] uppercase tracking-wider">
                                        <span>{article.categories?.name || 'NEWS'}</span>
                                        <span className="text-gray-300 font-normal">•</span>
                                        <span className="text-gray-400 font-bold">
                                            {new Date(article.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <Link href={`/news/${article.slug}`}>
                                        <h3 className="text-lg md:text-xl font-black text-black leading-snug hover:text-[#990000] hover:underline transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                    </Link>
                                    <p className="text-gray-500 text-xs font-sans leading-relaxed line-clamp-2">
                                        {article.excerpt}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-black/10 mt-8">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            baseUrl="/"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
