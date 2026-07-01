import { NextRequest, NextResponse } from 'next/server';
import { statsService } from '@/services/stats';

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    statsService.recordIP(ip);
    const stats = statsService.getStats();
    return NextResponse.json({ success: true, stats });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not fetch statistics' },
      { status: 500 },
    );
  }
}
