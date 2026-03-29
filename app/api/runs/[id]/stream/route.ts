import { NextRequest } from 'next/server'
import { getRunById, getWorkflowById, updateRun } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'
import { executeStep } from '@/lib/connectors/executor'

// SSE streaming endpoint for live run updates.
// Each step is executed by AI, producing real output instead of dummy text.
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

  const workflow = await getWorkflowById({ id: run.workflowId })
  if (!workflow) {
    return new Response('Workflow not found', { status: 404 })
  }

  const steps = (workflow.steps as any[]) || []
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        await updateRun({ id, data: { status: 'running' } })
        sendEvent({ status: 'running', step_results: [] })

        const stepResults: any[] = []
        let previousOutputs: string[] = []

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          const startTime = Date.now()

          // Send "running" status for this step
          const runningResult = {
            step_id: step.id || String(i + 1),
            agent: step.agent || 'Agent',
            action: step.action || 'Processing',
            status: 'running' as const,
            output: null,
            error: null,
            duration_ms: null,
          }

          stepResults.push(runningResult)
          sendEvent({ status: 'running', step_results: [...stepResults] })

          try {
            // Execute step using our real connector handlers
            const output = await executeStep({
              userId: session.user.id,
              step,
              previousOutputs,
            })

            const aiOutput = output

            const duration = Date.now() - startTime

            stepResults[i] = {
              ...runningResult,
              status: 'success' as const,
              output: aiOutput.trim(),
              duration_ms: duration,
            }
            previousOutputs.push(aiOutput.trim())

          } catch (stepError: any) {
            const duration = Date.now() - startTime
            stepResults[i] = {
              ...runningResult,
              status: 'failed' as const,
              output: null,
              error: stepError.message || 'Step execution failed',
              duration_ms: duration,
            }
          }

          // Persist progress after each step
          await updateRun({ id, data: { stepResults } })
          sendEvent({ status: 'running', step_results: [...stepResults] })
        }

        // Determine overall status
        const hasFailed = stepResults.some((r) => r.status === 'failed')
        const finalStatus = hasFailed ? 'failed' : 'success'
        const completedAt = new Date()

        await updateRun({
          id,
          data: {
            status: finalStatus,
            completedAt,
            stepResults,
            ...(hasFailed && { error: 'One or more steps failed' }),
          },
        })

        sendEvent({
          status: finalStatus,
          step_results: stepResults,
          completed_at: completedAt.toISOString(),
        })
      } catch (error: any) {
        console.error('Run execution error:', error)
        await updateRun({
          id,
          data: {
            status: 'failed',
            completedAt: new Date(),
            error: error.message || 'Unknown error',
          },
        })
        sendEvent({ status: 'failed', error: error.message || 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
