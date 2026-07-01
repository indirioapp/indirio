import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform, isValidUrl, getCleanUrl } from '@/services/platform';
import { downloaderService, VideoMetadata } from '@/services/downloader';
import { rateLimiter } from '@/services/rateLimiter';
import { cache } from '@/services/cache';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Lütfen geçerli bir video linki girin.' },
        { status: 400 },
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const rateCheck = rateLimiter.check(ip, 'analyze', 15, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla istek gönderdiniz. Lütfen ${rateCheck.reset} saniye sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateCheck.limit.toString(),
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
            'X-RateLimit-Reset': rateCheck.reset.toString(),
          },
        },
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: 'Girilen URL geçerli bir web adresi değil.' },
        { status: 400 },
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Bu video platformu desteklenmiyor veya link geçersiz.' },
        { status: 400 },
      );
    }

    const cleanUrl = getCleanUrl(url);

    const cacheKey = `analyze:${cleanUrl}`;
    const cachedData = await cache.get<VideoMetadata>(cacheKey);

    if (cachedData) {
      return NextResponse.json({ success: true, data: cachedData, cached: true });
    }

    const metadata = await downloaderService.extractMetadata(cleanUrl, platform);

    await cache.set(cacheKey, metadata, 3600);

    return NextResponse.json({ success: true, data: metadata, cached: false });
  } catch (err) {
    const errorObj = err as Error;
    console.error('API Error in /api/analyze:', errorObj);
    return NextResponse.json(
      { success: false, error: 'Video bilgileri yüklenirken beklenmedik bir hata oluştu.' },
      { status: 500 },
    );
  }
}
