import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveWorkflowsByTriggerType,
  createRun,
} from '@/lib/db/queries'
import { executeWorkflowRun } from '@/lib/workflows/engine'
import { pollForEvents } from '@/lib/workflows/polling'

// Simple cron expression matching for common patterns
function shouldCronRunNow(cronExpr: string): boolean {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts

  const matches = (expr: string, value: number): boolean => {
    if (expr === '*') return true
    if (expr.startsWith('*/')) {
      const interval = parseInt(expr.slice(2), 10)
      return value % interval === 0
    }
    if (expr.includes(',')) {
      return expr.split(',').some((v) => parseInt(v, 10) === value)
    }
    if (expr.includes('-')) {
      const [start, end] = expr.split('-').map((v) => parseInt(v, 10))
      return value >= start && value <= end
    }
    return parseInt(expr, 10) === value
  }

  return (
    matches(minuteExpr, now.getMinutes()) &&
    matches(hourExpr, now.getHours()) &&
    matches(domExpr, now.getDate()) &&
    matches(monthExpr, now.getMonth() + 1) &&
    matches(dowExpr, now.getDay())
  )
}

/**
 * Main Cron Entry Point
 * Called periodically to handle both Scheduled (Cron) and Event (Polling) workflows.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const triggered: string[] = []

    // ─── 1. Handle CRON (Scheduled) Workflows ───
    const cronWorkflows = await getActiveWorkflowsByTriggerType({
      triggerType: 'cron',
    })

    for (const wf of cronWorkflows) {
      if (shouldCronRunNow(wf.triggerValue || '')) {
        const run = await createRun({
          workflowId: wf.id,
          userId: wf.userId,
          triggeredBy: 'cron',
        })
        triggered.push(wf.id)
        executeWorkflowRun(run.id, wf.userId).catch(console.error)
      }
    }

    // ─── 2. Handle EVENT (Polling) Workflows ───
    // This checks Gmail, Slack, Notion, HubSpot, etc.
    const polledTriggered = await pollForEvents()
    triggered.push(...polledTriggered)

    return NextResponse.json({
      checked_cron: cronWorkflows.length,
      triggered_count: triggered.length,
      triggered_ids: triggered,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron handler error:', error)
    return NextResponse.json({ error: 'Cron handler failed' }, { status: 500 })
  }
}
