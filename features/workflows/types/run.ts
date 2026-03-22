export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'success' | 'failed'

export interface StepResult {
  step_id: string
  agent: string
  action: string
  status: StepStatus
  output?: any
  error?: string
  duration_ms?: number
}

export interface Run {
  id: string
  workflow_id: string
  user_id: string
  status: RunStatus
  triggered_by: string
  started_at: string
  completed_at?: string
  step_results: StepResult[]
  error?: string
}
