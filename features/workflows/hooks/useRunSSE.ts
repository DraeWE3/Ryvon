import { useEffect } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { useQueryClient } from '@tanstack/react-query'

export function useRunSSE(run_id: string | null) {
  const { updateLiveRun, liveRunData } = useWorkflowStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!run_id) return

    const es = new EventSource(`/api/runs/${run_id}/stream`)
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        updateLiveRun(run_id, data)
        
        // Disconnect if we hit a terminal state
        if (data.status === 'success' || data.status === 'failed') {
          es.close()
          // Optionally invalidate relevant queries to sync final state
          queryClient.invalidateQueries({ queryKey: ['run', run_id] })
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err)
      }
    }

    es.onerror = (err) => {
      console.error('SSE connection error', err)
      es.close()
    }

    return () => {
      es.close()
    }
  }, [run_id, updateLiveRun, queryClient])

  return run_id ? liveRunData[run_id] : undefined
}
