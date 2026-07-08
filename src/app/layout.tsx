import type { Metadata } from "next";
import { getCachedSiteSettings } from "@/lib/data";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

export const revalidate = 60

const inter = Inter({ subsets: ["latin"] });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ['300', '400', '700', '900'],
  variable: '--font-serif',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSiteSettings()
  return {
    title: `${settings.site_name} | Portal Berita Terpercaya`,
    description: settings.description,
    icons: {
      icon: settings.site_favicon_url || '/favicon.ico',
      shortcut: settings.site_favicon_url || '/favicon.ico',
      apple: settings.site_favicon_url || '/favicon.ico',
    },
    verification: {
      google: 'Qos1JSRySAiuFYjTm_X3eLQRpU1JPRF8EQy-3a03BVY',
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getCachedSiteSettings()

  return (
    <html lang="id" style={{ '--site-primary-color': settings.theme_color } as React.CSSProperties}>
      <body className={`${inter.className} ${merriweather.variable} antialiased selection:bg-primary/20`}>
        {settings.header_scripts && (
          <div
            id="header-scripts-injection"
            style={{ display: 'none' }}
            dangerouslySetInnerHTML={{ __html: settings.header_scripts }}
          />
        )}
        <div id="debug-env" style={{ display: 'none' }}>
          SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'}
        </div>
        {children}
      </body>
    </html>
  );
}
