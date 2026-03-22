import { NextRequest, NextResponse } from 'next/server'
import { getRunsByWorkflowId } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    const runs = await getRunsByWorkflowId({ workflowId: id, limit })
    return NextResponse.json(runs)
  } catch (error) {
    console.error('Failed to get runs:', error)
    return NextResponse.json({ error: 'Failed to get runs' }, { status: 500 })
  }
}
