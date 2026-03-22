import { NextRequest, NextResponse } from 'next/server'
import { createRun, getWorkflowById } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify workflow exists
    const wf = await getWorkflowById({ id })
    if (!wf) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const run = await createRun({
      workflowId: id,
      userId: session.user.id,
      triggeredBy: 'manual',
    })

    return NextResponse.json({
      ...run,
      workflow_id: run.workflowId,
      user_id: run.userId,
      triggered_by: run.triggeredBy,
      started_at: run.startedAt,
      completed_at: run.completedAt,
      step_results: run.stepResults,
    })
  } catch (error) {
    console.error('Failed to trigger run:', error)
    return NextResponse.json({ error: 'Failed to trigger run' }, { status: 500 })
  }
}
