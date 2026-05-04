'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useWorkflowDetail, useWorkflowRuns } from '@/features/workflows/hooks/useWorkflowDetail'
import { usePatchWorkflow, useRunWorkflow, useDeleteWorkflow } from '@/features/workflows/hooks/useWorkflows'
import { DragDropBuilder } from '@/features/workflows/components/DragDropBuilder'
import { RunHistoryList } from '@/features/workflows/components/RunHistoryList'
import { ToggleSwitch } from '@/features/workflows/components/ToggleSwitch'
import { Skeleton } from '@/features/workflows/components/Skeleton'
import { ConfirmModal } from '@/features/workflows/components/ConfirmModal'
import { RunDetailDrawer } from '@/features/workflows/drawers/RunDetailDrawer'
import { WorkflowToggle } from '@/features/workflows/components/WorkflowToggle'
import Play from 'lucide-react/dist/esm/icons/play'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import type { Step } from '@/features/workflows/types/workflow'

export function WorkflowDetailClient({ id }: { id: string }) {
  const router = useRouter()

  // ─── LOCAL HEARTBEAT ───
  // While this page is open in development, automatically ping the cron endpoint
  // every 30 seconds to simulate a live production background checker.
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/cron/workflows').catch(console.error)
    }, 30000)
    
    // Immediate ping on mount
    fetch('/api/cron/workflows').catch(console.error)
    
    return () => clearInterval(interval)
  }, [])
  
  const { data: workflow, isLoading, isError } = useWorkflowDetail(id)
  const { data: runs, isLoading: isRunsLoading, isError: isRunsError } = useWorkflowRuns(id)
  
  const { mutate: patchWorkflow, isPending: isPatching } = usePatchWorkflow()
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow()
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow()
  
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#000] text-white">
        Error loading workflow
      </div>
    )
  }

  const handleToggleActive = (checked: boolean) => {
    patchWorkflow(
      { id, data: { active: checked } },
      { onError: () => toast.error('Failed to update status') }
    )
  }

  const handleRunNow = () => {
    runWorkflow(id, {
      onSuccess: () => toast.success('Started workflow run'),
      onError: () => toast.error('Failed to trigger workflow')
    })
  }

  const handleDelete = () => {
    deleteWorkflow(id, {
      onSuccess: () => {
        toast.success('Workflow deleted')
        router.push('/workflows')
      },
      onError: () => toast.error('Failed to delete workflow')
    })
  }

  return (
    <div className="flex h-full flex-col p-6 lg:p-10 overflow-y-auto workflow-bg">
      {/* Header / Breadcrumbs */}
      <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-6">
          <Link 
            href="/workflows" 
            className="group flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[rgba(255,255,255,0.40)] hover:text-white hover:border-[rgba(255,255,255,0.20)] transition-all"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-motive text-[12px] text-[rgba(255,255,255,0.30)] uppercase tracking-wider mb-1">
              <Link href="/workflows" className="hover:text-[#32A2F2] transition-colors">Workflows</Link>
              <span>/</span>
              <span className="text-[rgba(255,255,255,0.50)]">Detail</span>
            </div>
            <h1 className="font-gate text-[28px] text-white font-semibold tracking-tight m-0">
              {isLoading ? <Skeleton width={200} height={32} /> : workflow?.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2">
            <span className="font-motive text-[12px] text-[rgba(255,255,255,0.50)]">Status</span>
            <ToggleSwitch 
              checked={workflow?.active ?? false} 
              onChange={handleToggleActive} 
              loading={isPatching}
            />
          </div>

          <button
            onClick={handleRunNow}
            disabled={isRunning || isLoading}
            className="group relative flex items-center gap-2 font-gate text-[13px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] px-6 py-2.5 rounded-full disabled:opacity-50 overflow-hidden shadow-[0_0_20px_rgba(50,162,242,0.2)]"
            style={{
              background: "linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)",
            }}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isRunning ? (
               <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" />
            ) : (
               <Play size={14} fill="currentColor" className="group-hover:translate-x-0.5 transition-transform" />
            )}
            <span>{isRunning ? 'Running...' : 'Run Now'}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(255,100,100,0.10)] bg-[rgba(255,100,100,0.02)] text-[rgba(255,100,100,0.50)] hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all cursor-pointer shadow-lg"
            title="Delete Workflow"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* Left Column: Build / Steps */}
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
          
          {/* Trigger Card */}
          <div className="group relative bg-[#000]/40 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-[20px] p-8 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:border-[rgba(50,162,242,0.3)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#8cdff4] to-[#3071e1] opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-gate text-[18px] text-white font-medium">Trigger Configuration</h3>
              <div className="px-3 py-1 rounded-full bg-[rgba(50,162,242,0.1)] border border-[rgba(50,162,242,0.2)]">
                <span className="font-motive text-[10px] text-[#8cdff4] uppercase tracking-widest font-bold">
                  {isLoading ? '...' : (workflow?.trigger_type || (workflow as any)?.triggerType)}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.40)]">
                  <Play size={14} />
                </div>
                <div>
                  <span className="block font-motive text-[11px] text-[rgba(255,255,255,0.30)] uppercase mb-0.5">Value</span>
                  <span className="font-mono text-[14px] text-white">
                    {isLoading ? '...' : (workflow?.trigger_value || (workflow as any)?.triggerValue)}
                  </span>
                </div>
              </div>

              <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                {isLoading ? '...' : (workflow?.trigger_description || (workflow as any)?.triggerDescription)}
              </p>

              {/* Event specific: Webhook URL */}
              {(workflow?.trigger_type || (workflow as any)?.triggerType) === 'event' && (
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.05)]">
                  <span className="font-motive text-[11px] text-[rgba(255,255,255,0.30)] block mb-2">Public Webhook Endpoint</span>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)]">
                    <code className="flex-1 font-mono text-[12px] text-[rgba(255,255,255,0.60)] truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/workflows` : ''}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/workflows`)
                        toast.success('Copied to clipboard')
                      }}
                      className="text-[11px] text-[#32A2F2] hover:text-[#8cdff4] font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Execution Steps Card */}
          <div className="bg-[#000]/40 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-gate text-[18px] text-white font-medium">Execution Flow</h3>
              <div className="text-[11px] text-[rgba(255,255,255,0.30)] font-motive uppercase tracking-widest">
                {workflow?.steps?.length || 0} Steps
              </div>
            </div>

            <DragDropBuilder
              initialSteps={(workflow?.steps || []) as Step[]}
              workflowId={id}
              onSave={(newSteps) => {
                patchWorkflow(
                  { id, data: { steps: newSteps } as any },
                  {
                    onSuccess: () => toast.success('Execution flow updated'),
                    onError: () => toast.error('Failed to save changes'),
                  }
                )
              }}
              isSaving={isPatching}
            />
          </div>
        </div>

        {/* Right Column: Run History */}
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
          <div className="bg-[#000]/60 backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-[24px] p-8 flex flex-col h-[750px] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <h3 className="font-gate text-[18px] text-white font-medium">Run History</h3>
              <div className="w-2 h-2 rounded-full bg-[#32A2F2] animate-pulse" />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <RunHistoryList 
                runs={runs} 
                isLoading={isRunsLoading} 
                isError={isRunsError} 
                onRunClick={(runId) => setSelectedRunId(runId)}
              />
            </div>
          </div>
        </div>

      </div>

      <RunDetailDrawer 
        runId={selectedRunId} 
        onClose={() => setSelectedRunId(null)} 
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Workflow"
        message={`This will permanently remove "${workflow?.name}" and all its execution history. Continue?`}
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
