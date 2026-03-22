import { useQuery } from '@tanstack/react-query'
import type { Workflow } from '../types/workflow'
import type { Run } from '../types/run'

export function useWorkflowDetail(id: string) {
  return useQuery<Workflow>({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${id}`)
      if (!res.ok) throw new Error('Failed to fetch workflow detail')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useWorkflowRuns(id: string) {
  return useQuery<Run[]>({
    queryKey: ['workflow-runs', id],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${id}/runs?limit=20`)
      if (!res.ok) throw new Error('Failed to fetch workflow runs')
      return res.json()
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch every 5s if any run is still running
      const runs = query.state.data
      if (runs && runs.some((r: Run) => r.status === 'running')) {
        return 5000
      }
      return false
    },
  })
}

export function useRunDetail(runId: string | null) {
  return useQuery<Run>({
    queryKey: ['run', runId],
    queryFn: async () => {
      if (!runId) throw new Error('No run ID provided')
      const res = await fetch(`/api/runs/${runId}`)
      if (!res.ok) throw new Error('Failed to fetch run detail')
      return res.json()
    },
    enabled: !!runId,
  })
}
