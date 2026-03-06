import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getCallLogsByUserId } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await getCallLogsByUserId({ userId: session.user.id });

    return NextResponse.json({
      success: true,
      logs: logs,
    });

  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
