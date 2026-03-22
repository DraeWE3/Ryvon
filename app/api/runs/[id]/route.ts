import { NextRequest } from 'next/server'
import { getRunById } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  const run = await getRunById({ id })
  if (!run) {
    return new Response('Run not found', { status: 404 })
  }

  return new Response(JSON.stringify({
    ...run,
    workflow_id: run.workflowId,
    user_id: run.userId,
    triggered_by: run.triggeredBy,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    step_results: run.stepResults,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
