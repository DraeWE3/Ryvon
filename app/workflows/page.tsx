'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflows, useWorkflowStats, usePatchWorkflow } from '@/features/workflows/hooks/useWorkflows'
import { MetricCard } from '@/features/workflows/components/MetricCard'
import { WorkflowGrid } from '@/features/workflows/components/WorkflowGrid'
import { CreateWorkflowDrawer } from '@/features/workflows/drawers/CreateWorkflowDrawer'
import { useWorkflowUIStore } from '@/features/workflows/hooks/useCreateWorkflow'

import { WorkflowToggle } from '@/features/workflows/components/WorkflowToggle'
import { toast } from 'react-hot-toast'

export default function WorkflowsDashboard() {
  const { data: session } = useSession()
  const userId = session?.user?.id || 'temp-user-id'

  const { 
    data: workflows, 
    isLoading: isWorkflowsLoading, 
    isError: isWorkflowsError,
    refetch: refetchWorkflows
  } = useWorkflows(userId)

  const { 
    data: stats, 
    isLoading: isStatsLoading 
  } = useWorkflowStats(userId)

  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const res = await fetch('/api/workflows/templates')
      if (!res.ok) throw new Error('Failed to load templates')
      return res.json()
    },
  })

  const { setCreateDrawerOpen, setSelectedTemplate } = useWorkflowUIStore()
  const { mutate: patchWorkflow } = usePatchWorkflow()

  const handleToggle = (id: string, active: boolean) => {
    patchWorkflow({ id, data: { active } }, {
      onSuccess: () => toast.success(`Workflow ${active ? 'enabled' : 'disabled'}`),
      onError: () => toast.error('Failed to update workflow')
    })
  }

  // Calculate metrics
  const totalWorkflows = workflows?.length || 0
  const activeWorkflows = workflows?.filter(w => w.active).length || 0
  const runsToday = stats?.runs_today || 0

  // Combine user workflows and templates
  const combinedWorkflows = [
    ...(workflows || []),
    ...(templates || []).map((t: any) => ({
      ...t,
      isTemplate: true,
      onUseTemplate: setSelectedTemplate
    }))
  ]

  return (
    <div className="flex h-full flex-col p-8 overflow-y-auto workflow-bg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <WorkflowToggle className="p-0 mr-4" />
          <div>
            <h1 className="font-gate text-[24px] text-[#ffffff] font-medium leading-tight mb-2 m-0">
              Workflow Automation
            </h1>
            <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] m-0">
              Automate tasks and connect agents with intelligent workflows.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/workflows/connectors"
            className="font-motive text-[13px] text-[rgba(255,255,255,0.60)] hover:text-[#ffffff] border border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] rounded-full px-[20px] py-[10px] transition-all"
          >
            🔌 Connectors
          </Link>
          <button
            onClick={() => setCreateDrawerOpen(true)}
            className="font-motive text-[13px] text-[#ffffff] rounded-full px-[20px] py-[10px] transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)',
              boxShadow: '0 4px 15px rgba(0, 125, 192, 0.3)',
            }}
          >
            + New Workflow
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard 
          label="Total Workflows" 
          value={totalWorkflows} 
          loading={isWorkflowsLoading} 
        />
        <MetricCard 
          label="Active" 
          value={activeWorkflows} 
          loading={isWorkflowsLoading} 
        />
        <MetricCard 
          label="Runs Today" 
          value={runsToday} 
          trend={runsToday > 0 ? '+12%' : undefined} // Mock trend
          loading={isStatsLoading} 
        />
      </div>

      {/* Table Section */}
      <div className="flex flex-col flex-1">
        <h2 className="font-gate text-[20px] text-[#ffffff] font-medium mb-6">
          All Workflows
        </h2>
        <WorkflowGrid 
          workflows={combinedWorkflows}
          isLoading={isWorkflowsLoading}
          isError={isWorkflowsError}
          onRetry={refetchWorkflows}
          onToggle={handleToggle}
        />
      </div>

      {/* Drawers */}
      <CreateWorkflowDrawer onWorkflowCreated={refetchWorkflows} />
    </div>
  )
}
