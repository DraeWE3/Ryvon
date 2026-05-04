'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflows, useWorkflowStats, usePatchWorkflow } from '@/features/workflows/hooks/useWorkflows'
import { MetricCard } from '@/features/workflows/components/MetricCard'
import { WorkflowGrid } from '@/features/workflows/components/WorkflowGrid'
import { CreateWorkflowDrawer } from '@/features/workflows/drawers/CreateWorkflowDrawer'
import { useWorkflowUIStore } from '@/features/workflows/hooks/useCreateWorkflow'

import { SidebarToggle } from '@/components/sidebar-toggle'
import { toast } from 'react-hot-toast'

export default function WorkflowsDashboard() {
  const router = useRouter()
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

  const handleRun = async (id: string) => {
    if (session?.user?.type === 'guest') {
      toast.error('Sign in to run workflows!')
      router.push('/register')
      return
    }

    try {
      const res = await fetch(`/api/workflows/${id}/run`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to run workflow')
      
      toast.success('Automation started!')
      router.push(`/workflows/${id}`) // Redirect to details
    } catch (err) {
      console.error(err)
      toast.error('Failed to start automation')
    }
  }

  const handleToggle = (id: string, active: boolean) => {
    if (session?.user?.type === 'guest') {
      toast.error('Sign in to manage workflows!')
      router.push('/register')
      return
    }
    patchWorkflow({ id, data: { active } }, {
      onSuccess: () => toast.success(`Workflow ${active ? 'enabled' : 'disabled'}`),
      onError: () => toast.error('Failed to update workflow')
    })
  }

  // Calculate metrics
  const totalWorkflows = workflows?.length || 0
  const activeWorkflows = workflows?.filter(w => w.active).length || 0
  const runsToday = stats?.runs_today || 0
  const totalRuns = stats?.total_runs || 0

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 header-seq">
        <div className="flex items-center">
          <SidebarToggle className="p-0 mr-4" />
          <div>
            <h1 className="font-gate text-[24px] text-[#ffffff] font-medium leading-tight mb-2 m-0">
              Workflow Automation
            </h1>
            <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] m-0">
              Automate tasks and connect agents with intelligent workflows.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              if (session?.user?.type === 'guest') {
                toast.error('Sign in to manage connectors!')
                router.push('/register')
                return
              }
              router.push('/workflows/connectors')
            }}
            className="flex-1 md:flex-none text-center font-motive text-[13px] text-[rgba(255,255,255,0.60)] hover:text-[#ffffff] border border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] rounded-full px-[20px] py-[10px] transition-all"
          >
            🔌 Connectors
          </button>
          <button
            onClick={() => {
              if (session?.user?.type === 'guest') {
                toast.error('Sign in to create workflows!')
                router.push('/register')
                return
              }
              setCreateDrawerOpen(true)
            }}
            className="flex-1 md:flex-none font-motive text-[13px] text-[#ffffff] rounded-full px-[20px] py-[10px] transition-all hover:opacity-90 active:scale-[0.97]"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <MetricCard 
          label="Total Workflows" 
          value={totalWorkflows} 
          trend={totalWorkflows > 0 ? '+15.2%' : '0.0%'}
          loading={isWorkflowsLoading} 
        />
        <MetricCard 
          label="Active Automations" 
          value={activeWorkflows} 
          trend={activeWorkflows > 0 ? '+2.1%' : '0.0%'}
          loading={isWorkflowsLoading} 
        />
        <MetricCard 
          label="Runs Today" 
          value={runsToday} 
          trend={runsToday > 0 ? '+25.3%' : '0.0%'}
          loading={isStatsLoading} 
        />
        <MetricCard 
          label="All-time Executions" 
          value={totalRuns} 
          trend={totalRuns > 0 ? '+1.1%' : '0.0%'}
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
          onRun={handleRun}
        />
      </div>

      {/* Drawers */}
      <CreateWorkflowDrawer onWorkflowCreated={refetchWorkflows} />
    </div>
  )
}
