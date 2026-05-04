import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveWorkflowsByEventValue,
  createRun,
} from '@/lib/db/queries'
import { executeWorkflowRun } from '@/lib/workflows/engine'

// Webhook listener endpoint for event-triggered workflows.
// External services call POST /api/webhooks/workflows with a JSON body
// containing an `event` field (e.g. "new_lead", "new_customer", "new_ticket").
// All active workflows matching that event will be triggered.
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-ryvon-signature')
    const secret = process.env.WEBHOOK_SECRET

    if (secret && signature !== secret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 })
    }

    const body = await request.json()
    const { event, payload } = body

    if (!event || typeof event !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "event" field. Expected: { "event": "new_lead", "payload": {...} }' },
        { status: 400 }
      )
    }

    // Normalize event name — workflows store trigger_value as "webhook:event_name"
    const eventValues = [
      event,
      `webhook:${event}`,
      event.replace('webhook:', ''),
    ]

    // Find all active workflows that match any of these event values
    const matchedWorkflows: any[] = []
    for (const val of eventValues) {
      const workflows = await getActiveWorkflowsByEventValue({ eventValue: val })
      for (const wf of workflows) {
        if (!matchedWorkflows.some((m) => m.id === wf.id)) {
          matchedWorkflows.push(wf)
        }
      }
    }

    if (matchedWorkflows.length === 0) {
      return NextResponse.json({
        matched: 0,
        message: `No active workflows found for event "${event}"`,
      })
    }

    const triggered: Array<{ workflow_id: string; run_id: string }> = []

    for (const wf of matchedWorkflows) {
      const run = await createRun({
        workflowId: wf.id,
        userId: wf.userId,
        triggeredBy: `event:${event}`,
      })

      triggered.push({ workflow_id: wf.id, run_id: run.id })

      // Fire-and-forget: execute directly (no HTTP roundtrip)
      executeWorkflowRun(run.id, wf.userId).catch((err) => {
        console.error(`[Webhook] Failed to execute run ${run.id}:`, err)
      })
    }

    return NextResponse.json({
      event,
      matched: matchedWorkflows.length,
      triggered,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
