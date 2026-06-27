'use client'

import { usePathname } from 'next/navigation'
import Navbar from "./Navbar"
import BottomNav from "./BottomNav"
import SkinAds from "./SkinAds"
import Link from "next/link"
import NextImage from "next/image"
import { BreakingNewsTicker } from "./BreakingNewsTicker"

interface LayoutWrapperProps {
    children: React.ReactNode
    categories: any[]
    navLinks: any[]
    headerAd: any
    skinAds: { left: any, right: any }
    siteName?: string
    logoType?: 'text' | 'image'
    siteLogoUrl?: string
    contactWhatsapp?: string
    contactEmail?: string
    site_favicon_url?: string
    site_url?: string
    siteDescription?: string
    activeTemplate?: string
    footerCopyright?: string
}

export default function LayoutWrapper({
    children,
    categories,
    navLinks,
    headerAd,
    skinAds,
    siteName = 'NEWSLAN.ID',
    logoType = 'text',
    siteLogoUrl = '/logo.png',
    contactWhatsapp = '+62 823-7886-5775',
    contactEmail = 'redaksi@newslan.id',
    site_url = '',
    siteDescription = 'Portal berita terpercaya dengan fokus pada edukasi, investigasi, dan pemberitaan akurat untuk mencerdaskan kehidupan bangsa.',
    activeTemplate = 'tempo',
    footerCopyright
}: LayoutWrapperProps) {
    const pathname = usePathname()
    const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/auth')
    const isGamePortal = pathname.startsWith('/games')

    if (isAdmin) return <>{children}</>

    return (
        <>
            <SkinAds skinAds={skinAds} />
            <BreakingNewsTicker siteName={siteName} />
            <Navbar
                categories={categories}
                navLinks={navLinks}
                headerAd={headerAd}
                siteName={siteName}
                logoType={logoType}
                siteLogoUrl={siteLogoUrl}
                siteDescription={siteDescription}
                activeTemplate={activeTemplate}
                hideCategories={pathname.startsWith('/products')}
            />
            <div className={isGamePortal ? "w-full bg-transparent min-h-screen transition-all duration-300" : "boxed-container transition-all duration-300"}>
                <main className="min-h-screen pb-20 lg:pb-0">
                    {children}
                </main>
                <BottomNav />
            </div>
            {activeTemplate === 'cnn' ? (
                <footer className="bg-[#1a1a1a] text-white py-12 mt-10">
                    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Top Header Footer */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-10 border-b border-white/10">
                            <Link href="/" className="flex items-center gap-4 brightness-0 invert opacity-90 hover:opacity-100 transition-all shrink-0">
                                {logoType === 'image' && siteLogoUrl ? (
                                    <div className="relative h-10 w-36 transition-all">
                                        <img
                                            src={siteLogoUrl}
                                            alt={`${siteName} Logo`}
                                            className="w-full h-full object-contain object-left"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                                        {siteName.split('.')[0]}
                                    </span>
                                )}
                            </Link>
                            {siteDescription && (
                                <span className="text-[13px] font-bold text-gray-300 md:border-l md:border-white/20 md:pl-6 leading-snug">
                                    {siteDescription.split('.')[0]}
                                </span>
                            )}
                        </div>

                        {/* Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                            <div className="space-y-4">
                                <p className="text-[13px] text-gray-300 leading-relaxed font-medium">
                                    Menyajikan berita terhangat langsung melalui handphone Anda.
                                </p>
                                <div className="pt-2">
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-white">Download Sekarang</span>
                                </div>
                            </div>
                            
                            <div className="space-y-6 md:col-span-2">
                                <h4 className="text-[12px] font-black uppercase tracking-widest text-white">Telusuri</h4>
                                <ul className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px] font-bold">
                                    {categories.slice(0, 10).map(cat => (
                                        <li key={cat.id}>
                                            <Link href={`/category/${cat.slug}`} className="text-gray-400 hover:text-white transition-colors">
                                                {cat.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="space-y-6">
                                <h4 className="text-[12px] font-black uppercase tracking-widest text-white">Kontak & Layanan</h4>
                                <ul className="space-y-4 text-[13px] font-bold text-gray-400">
                                    <li>WhatsApp: <span className="text-white">{contactWhatsapp}</span></li>
                                    <li>Email: <span className="text-white">{contactEmail}</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Copyright & Links */}
                        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-col items-center gap-4 text-center">
                            <p className="text-gray-500 text-[11px] font-medium leading-relaxed max-w-4xl">
                                {footerCopyright ? (
                                    footerCopyright.replace('{year}', new Date().getFullYear().toString())
                                ) : (
                                    <>
                                        &copy; {new Date().getFullYear()} {siteName.toUpperCase()} - {siteDescription.split('.')[0]}. Hak cipta dilindungi undang-undang.
                                    </>
                                )}
                            </p>
                            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-bold text-gray-400">
                                {navLinks.filter(l => l.is_footer).length > 0 ? (
                                    navLinks.filter(l => l.is_footer).map((link: any) => (
                                        <li key={link.id}>
                                            <Link href={link.href} className="hover:text-white transition-colors">
                                                {link.title}
                                            </Link>
                                        </li>
                                    ))
                                ) : (
                                    <>
                                        <li><Link href="/redaksi" className="hover:text-white transition-colors">Redaksi</Link></li>
                                        <li><Link href="/company-profile" className="hover:text-white transition-colors">Company Profile</Link></li>
                                        <li><Link href="/pedoman-media-siber" className="hover:text-white transition-colors">Pedoman Media Siber</Link></li>
                                        <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Kebijakan Privasi</Link></li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </footer>
            ) : (
                <footer className="bg-[#0f0f0f] text-white border-t border-white/5 py-20 mt-10">
                    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                            <div className="space-y-6">
                                <Link href="/" className="flex flex-col items-start gap-4 brightness-0 invert opacity-80 hover:opacity-100 transition-all">
                                    {logoType === 'image' && siteLogoUrl ? (
                                        <div className="relative h-12 w-48 transition-all">
                                            <img
                                                src={siteLogoUrl}
                                                alt={`${siteName} Logo`}
                                                className="w-full h-full object-contain object-left"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                                            {siteName.split('.')[0]}
                                            {siteName.includes('.') && <span className="text-primary">.{siteName.split('.')[1]}</span>}
                                        </span>
                                    )}
                                </Link>
                                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                    {siteDescription}
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Informasi</h4>
                                <ul className="space-y-3 text-sm font-bold">
                                    {navLinks.filter(l => l.is_footer).length > 0 ? (
                                        navLinks.filter(l => l.is_footer).map((link: any) => (
                                            <li key={link.id}>
                                                <Link href={link.href} className="text-gray-300 hover:text-white transition-colors">
                                                    {link.title}
                                                </Link>
                                            </li>
                                        ))
                                    ) : (
                                        <>
                                            <li><Link href="/redaksi" className="text-gray-300 hover:text-white transition-colors">Redaksi</Link></li>
                                            <li><Link href="/company-profile" className="text-gray-300 hover:text-white transition-colors">Company Profile</Link></li>
                                            <li><Link href="/pedoman-media-siber" className="text-gray-300 hover:text-white transition-colors">Pedoman Media Siber</Link></li>
                                            <li><Link href="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Layanan</h4>
                                <ul className="space-y-3 text-sm font-bold">
                                    <li><Link href="/subscribe" className="text-gray-300 hover:text-white transition-colors">Langganan</Link></li>
                                    <li><Link href="/shorts" className="text-gray-300 hover:text-white transition-colors">Video Shorts</Link></li>
                                    <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Kontak</Link></li>
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Kontak Kami</h4>
                                <div className="space-y-2 text-sm text-gray-400 font-medium">
                                    <p>WhatsApp: {contactWhatsapp}</p>
                                    <p>Email: {contactEmail}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-white/5 text-center">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                {footerCopyright ? (
                                    footerCopyright.replace('{year}', new Date().getFullYear().toString())
                                ) : (
                                    <>
                                        &copy; {new Date().getFullYear()} {siteName.toUpperCase()} - {siteDescription.split('.')[0]}. Diterbitkan oleh PT. LINTAS AKTUAL NUSANTARA.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </footer>
            )}
        </>
    )
}
