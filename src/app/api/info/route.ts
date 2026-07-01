import { NextResponse } from 'next/server';
import { getLocalIPAddress } from '@/utils/ip';

export async function GET() {
  try {
    const localIp = getLocalIPAddress();
    return NextResponse.json({ success: true, localIp });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not fetch local IP address' },
      { status: 500 },
    );
  }
}
