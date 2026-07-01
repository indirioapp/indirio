import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/services/queue';
import { rateLimiter } from '@/services/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const { url, format, quality, subtitleLang } = await req.json();

    if (!url || !format || !quality) {
      return NextResponse.json(
        { success: false, error: 'Eksik parametre. url, format ve quality zorunludur.' },
        { status: 400 },
      );
    }

    if (format !== 'mp4' && format !== 'mp3' && format !== 'srt' && format !== 'vtt') {
      return NextResponse.json(
        { success: false, error: 'Geçersiz format. mp4, mp3, srt veya vtt seçilmelidir.' },
        { status: 400 },
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const rateCheck = rateLimiter.check(ip, 'download', 8, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla indirme isteği gönderdiniz. Lütfen ${rateCheck.reset} saniye sonra tekrar deneyin.`,
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

    const job = await queueService.createJob(url, format, quality, subtitleLang);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      title: job.title,
      status: job.status,
    });
  } catch (err) {
    const errorObj = err as Error;
    console.error('API Error in /api/download:', errorObj);
    return NextResponse.json(
      {
        success: false,
        error: errorObj.message || 'İndirme işlemi başlatılırken bir hata oluştu.',
      },
      { status: 500 },
    );
  }
}
