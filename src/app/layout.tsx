import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'indirio.com.tr | Video indirmenin en hızlı yolu',
  description:
    "indirio.com.tr ile YouTube, TikTok, Instagram ve X (Twitter)'dan saniyeler içinde yüksek kaliteli MP4 video ve MP3 ses indirin. Reklamsız, hızlı ve güvenli.",
  keywords:
    'video indir, youtube video indir, tiktok video indir, instagram reels indir, twitter video indir, mp4 indir, mp3 dönüştürücü, indirio, ücretsiz video indir, online video indirici,indirio.com.tr, indirio com tr, indirio net, indirvideo, youtube mp3 dönüştürücü, instagram video indir, twitter mp4 indir, video downloader, free video downloader, download youtube video, tiktok video downloader, download instagram reels, download twitter video, online media downloader, youtube to mp3 converter, convert youtube to mp3',
  authors: [{ name: 'indirio.com.tr Team' }],
  metadataBase: new URL('https://indirio.com.tr'),
  openGraph: {
    title: 'indirio.com.tr | Hızlı ve Ücretsiz Video İndirici',
    description:
      "Saniyeler içinde YouTube, TikTok, Instagram ve X (Twitter)'dan video ve ses indirin.",
    url: 'https://indirio.com.tr',
    siteName: 'indirio.com.tr',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'indirio.com.tr | Hızlı ve Ücretsiz Video İndirici',
    description:
      "Saniyeler içinde YouTube, TikTok, Instagram ve X (Twitter)'dan video ve ses indirin.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
  alternates: {
    canonical: 'https://indirio.com.tr',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || 'google-verification-placeholder',
  },
};

import { LanguageProvider } from '@/context/LanguageContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full flex flex-col bg-[#020205] text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "indirio.com.tr",
              "url": "https://indirio.com.tr",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://indirio.com.tr/?url={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
