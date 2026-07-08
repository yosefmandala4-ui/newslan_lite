'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, ChevronRight, X } from 'lucide-react'

interface VideoSectionClientProps {
    shorts: any[]
}

export default function VideoSectionClient({ shorts }: VideoSectionClientProps) {
    const [selectedVideo, setSelectedVideo] = useState<any>(null)

    if (!shorts || shorts.length === 0) return null

    // Helper for YouTube ID
    const getYTID = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    return (
        <>
            <section className="py-10 bg-[#0d0d0d] text-white mt-4">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
                            <span className="text-red-600">9/16</span> Play
                        </h2>
                        <Link href="/shorts" className="text-[11px] font-black text-gray-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5">
                            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                        {shorts.map((video) => {
                            const ytId = getYTID(video.video_url)
                            return (
                                <div
                                    key={video.id}
                                    className="min-w-[150px] md:min-w-[200px] aspect-[9/16] relative transition-all duration-500 hover:scale-[1.02] cursor-pointer group snap-start rounded-lg overflow-hidden"
                                    onClick={() => setSelectedVideo(video)}
                                >
                                    <Image
                                        src={video.thumbnail_url || `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                        alt={video.title}
                                        fill
                                        className="object-cover brightness-75 group-hover:brightness-100 transition-all"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Play className="w-2.5 h-2.5 text-white fill-current" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Video</span>
                                        </div>
                                        <h3 className="text-[12px] font-bold leading-tight line-clamp-3 group-hover:text-red-400 transition-colors">
                                            {video.title}
                                        </h3>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ===== VIDEO MODAL ===== */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    <div
                        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
                        onClick={() => setSelectedVideo(null)}
                    />
                    <div className="relative w-full max-w-sm aspect-[9/16] bg-black overflow-hidden shadow-2xl ring-1 ring-white/10 rounded-2xl">
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all z-20"
                            onClick={() => setSelectedVideo(null)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${getYTID(selectedVideo.video_url)}?autoplay=1&modestbranding=1&rel=0`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </>
    )
}
