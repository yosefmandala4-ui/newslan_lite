import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'newslan.id',
      },
      {
        protocol: 'https',
        hostname: 'dxflzgwpibnoiktvftwp.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // HTTP Cache-Control Headers
  // Tells Cloudflare edge to cache rendered HTML pages.
  // → s-maxage: how long Cloudflare holds the cache (in seconds)
  // → stale-while-revalidate: serve stale while quietly refreshing in background
  // → Bot/real user both get the same cached response = Worker CPU = 0
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        // Static Info Pages (Redaksi, Privacy, dll) — cache 30 HARI (Permanen)
        source: '/(redaksi|privacy-policy|pedoman-media-siber|contact|subscribe)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // News article detail pages — cache 1 TAHUN (Permanen)
        source: '/news/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=31536000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Homepage — cache 30s, stale ok for 2 min
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=120',
          },
        ],
      },
      {
        // Category pages — cache 60s, stale ok for 5 min
        source: '/category/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Search & indeks — shorter cache, content changes often
        source: '/search',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=60',
          },
        ],
      },
      {
        // Admin routes — NEVER cache
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
