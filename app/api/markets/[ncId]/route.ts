import { NextRequest, NextResponse } from 'next/server';
import { getMarket } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { ncId: string } }) {
  const market = getMarket(params.ncId);
  if (!market) {
    return NextResponse.json({ error: 'market not found' }, { status: 404 });
  }
  return NextResponse.json({ market });
}
