import { create } from 'zustand'

export interface LiveRunData {
  status?: string
  step_results?: any[]
  [key: string]: any
}

interface WorkflowState {
  activeRunIds: string[]
  liveRunData: Record<string, LiveRunData>
  addActiveRun: (run_id: string) => void
  removeActiveRun: (run_id: string) => void
  updateLiveRun: (run_id: string, partial: Partial<LiveRunData>) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  activeRunIds: [],
  liveRunData: {},

  addActiveRun: (run_id: string) =>
    set((state) => ({
      activeRunIds: [...new Set([...state.activeRunIds, run_id])],
    })),

  removeActiveRun: (run_id: string) =>
    set((state) => ({
      activeRunIds: state.activeRunIds.filter((id) => id !== run_id),
    })),

  updateLiveRun: (run_id: string, partial: Partial<LiveRunData>) =>
    set((state) => ({
      liveRunData: {
        ...state.liveRunData,
        [run_id]: {
          ...(state.liveRunData[run_id] || {}),
          ...partial,
        },
      },
    })),
}))
