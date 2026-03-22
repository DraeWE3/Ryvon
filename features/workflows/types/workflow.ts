export type TriggerType = 'cron' | 'event' | 'manual'

export interface Step {
  id: string
  agent: string
  action: string
  params: Record<string, any>
  depends_on: string[]
}

export interface Workflow {
  id: string
  user_id: string
  name: string
  trigger_type: TriggerType
  trigger_value: string
  trigger_description: string
  category: string
  icon: string
  steps: Step[]
  active: boolean
  last_run?: import('./run').Run
  created_at: string
  updated_at: string
}
