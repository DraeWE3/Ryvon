import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Workflow } from '../types/workflow'

// Note: These use fetch internally, but could be adapted to use the existing axios instance if needed.

export function useWorkflows(userId?: string) {
  return useQuery<Workflow[]>({
    queryKey: ['workflows', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await fetch(`/api/workflows?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch workflows')
      return res.json()
    },
    enabled: !!userId,
    refetchInterval: 30000,
  })
}

export function useWorkflowStats(userId?: string) {
  return useQuery({
    queryKey: ['workflow-stats', userId],
    queryFn: async () => {
      if (!userId) return { runs_today: 0 }
      const res = await fetch(`/api/workflows/stats?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch workflow stats')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useConnectors(userId?: string) {
  return useQuery({
    queryKey: ['connectors', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await fetch(`/api/connectors?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch connectors')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function usePatchWorkflow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Workflow> }) => {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update workflow')
      return res.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.id] })
    },
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete workflow')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useRunWorkflow() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workflows/${id}/run`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to trigger workflow run')
      return res.json()
    },
  })
}
