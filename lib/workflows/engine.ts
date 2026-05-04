import { getRunById, getWorkflowById, updateRun } from '@/lib/db/queries'
import { executeStep } from '@/lib/connectors/executor'

/**
 * Core workflow execution engine.
 * Runs all steps in sequence, updating the database after each step.
 * This is called directly (not via HTTP) so there are no auth/connection issues.
 */
export async function executeWorkflowRun(runId: string, userId: string): Promise<void> {
  const run = await getRunById({ id: runId })
  if (!run) {
    console.error(`[Engine] Run ${runId} not found`)
    return
  }

  const workflow = await getWorkflowById({ id: run.workflowId })
  if (!workflow) {
    console.error(`[Engine] Workflow ${run.workflowId} not found for run ${runId}`)
    await updateRun({ id: runId, data: { status: 'failed', completedAt: new Date(), error: 'Workflow not found' } })
    return
  }

  const steps = (workflow.steps as any[]) || []

  if (steps.length === 0) {
    // No steps — mark as success immediately
    await updateRun({ id: runId, data: { status: 'success', completedAt: new Date(), stepResults: [] } })
    return
  }

  try {
    await updateRun({ id: runId, data: { status: 'running' } })

    const stepResults: any[] = []
    let previousOutputs: string[] = []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const startTime = Date.now()

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

      try {
        const executePromise = executeStep({
          userId,
          step,
          previousOutputs,
        })

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Step execution timed out after 45 seconds')), 45000)
        )

        const output = await Promise.race([executePromise, timeoutPromise])
        const duration = Date.now() - startTime

        stepResults[i] = {
          ...runningResult,
          status: 'success' as const,
          output: output.trim(),
          duration_ms: duration,
        }
        previousOutputs.push(output.trim())

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
      await updateRun({ id: runId, data: { stepResults } })
    }

    // Determine overall status
    const hasFailed = stepResults.some((r) => r.status === 'failed')
    const finalStatus = hasFailed ? 'failed' : 'success'

    await updateRun({
      id: runId,
      data: {
        status: finalStatus,
        completedAt: new Date(),
        stepResults,
        ...(hasFailed && { error: 'One or more steps failed' }),
      },
    })

    console.log(`[Engine] Run ${runId} completed with status: ${finalStatus}`)

  } catch (error: any) {
    console.error(`[Engine] Run ${runId} fatal error:`, error)
    await updateRun({
      id: runId,
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error.message || 'Unknown error',
      },
    })
  }
}
