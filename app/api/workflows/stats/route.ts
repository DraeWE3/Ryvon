import { NextRequest, NextResponse } from 'next/server'
import { getWorkflowStats } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getWorkflowStats({ userId: session.user.id })
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch workflow stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
