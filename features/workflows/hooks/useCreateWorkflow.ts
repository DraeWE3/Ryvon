import { useMutation } from '@tanstack/react-query'

export function useCreateWorkflow() {
  return useMutation({
    mutationFn: async (input: string) => {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (!res.ok) throw new Error('Failed to generate workflow')
      return res.json()
    },
  })
}

// A simple local state store to control the drawers, mirroring the 'uiStore' mentioned in spec
import { create } from 'zustand'

interface WorkflowUIStore {
  isCreateDrawerOpen: boolean
  setCreateDrawerOpen: (open: boolean) => void
}

export const useWorkflowUIStore = create<WorkflowUIStore>((set) => ({
  isCreateDrawerOpen: false,
  setCreateDrawerOpen: (open) => set({ isCreateDrawerOpen: open }),
}))
