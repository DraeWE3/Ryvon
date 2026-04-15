import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveWorkflowsByTriggerType,
  createRun,
} from '@/lib/db/queries'

// Simple cron expression matching for common patterns
// Supports: minute hour day-of-month month day-of-week
function shouldCronRunNow(cronExpr: string): boolean {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts

  const matches = (expr: string, value: number, max: number): boolean => {
    if (expr === '*') return true

    // Handle */N (every N)
    if (expr.startsWith('*/')) {
      const interval = parseInt(expr.slice(2), 10)
      if (isNaN(interval) || interval <= 0) return false
      return value % interval === 0
    }

    // Handle comma-separated values (1,2,3)
    if (expr.includes(',')) {
      return expr.split(',').some((v) => parseInt(v, 10) === value)
    }

    // Handle ranges (1-5)
    if (expr.includes('-')) {
      const [start, end] = expr.split('-').map((v) => parseInt(v, 10))
      return value >= start && value <= end
    }

    // Exact match
    return parseInt(expr, 10) === value
  }

  return (
    matches(minuteExpr, now.getMinutes(), 59) &&
    matches(hourExpr, now.getHours(), 23) &&
    matches(domExpr, now.getDate(), 31) &&
    matches(monthExpr, now.getMonth() + 1, 12) &&
    matches(dowExpr, now.getDay(), 6)
  )
}

// This endpoint is called by Vercel Cron Jobs every minute.
// It checks all active cron workflows, matches their expressions
// against the current time, and creates runs for matches.
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[CRON] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active cron workflows
    const cronWorkflows = await getActiveWorkflowsByTriggerType({
      triggerType: 'cron',
    })

    const triggered: string[] = []
    
    // Determine the base URL for triggering executions
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const host = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'localhost:3000'
    const baseUrl = host.startsWith('http') ? host : `${protocol}://${host.replace(/\/$/, '')}`

    console.log(`[CRON] ${new Date().toISOString()} - Checking ${cronWorkflows.length} active cron workflows. BaseURL: ${baseUrl}`)

    for (const wf of cronWorkflows) {
      const cronExpr = wf.triggerValue
      if (!cronExpr || cronExpr === 'manual') continue

      if (shouldCronRunNow(cronExpr)) {
        console.log(`[CRON] Match found! Triggering: ${wf.id} (${wf.name})`)
        
        // Create a new run for this workflow
        const run = await createRun({
          workflowId: wf.id,
          userId: wf.userId,
          triggeredBy: 'cron',
        })
        triggered.push(wf.id)

        // Fire-and-forget: call the SSE stream endpoint to execute the run
        fetch(`${baseUrl}/api/runs/${run.id}/stream`, {
          method: 'GET',
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        }).catch((err) => {
          console.error(`[CRON] Failed to trigger run execution for ${run.id}:`, err)
        })
      }
    }

    return NextResponse.json({
      checked: cronWorkflows.length,
      triggered: triggered.length,
      workflow_ids: triggered,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron handler error:', error)
    return NextResponse.json(
      { error: 'Cron handler failed' },
      { status: 500 }
    )
  }
}
