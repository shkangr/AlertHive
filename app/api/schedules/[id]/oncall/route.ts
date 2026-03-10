import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateOnCall } from '@/lib/oncall';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: scheduleId } = await params;

  // Parse query param: `at` (ISO timestamp, default: now)
  const searchParams = request.nextUrl.searchParams;
  const atParam = searchParams.get('at');

  let at: Date;
  if (atParam) {
    at = new Date(atParam);
    if (isNaN(at.getTime())) {
      return NextResponse.json(
        { error: 'Invalid `at` parameter. Must be a valid ISO 8601 timestamp.' },
        { status: 400 }
      );
    }
  } else {
    at = new Date();
  }

  const result = await calculateOnCall(scheduleId, at);

  if (!result) {
    return NextResponse.json(
      { error: 'Schedule not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
