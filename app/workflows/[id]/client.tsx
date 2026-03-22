'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useWorkflowDetail, useWorkflowRuns } from '@/features/workflows/hooks/useWorkflowDetail'
import { usePatchWorkflow, useRunWorkflow, useDeleteWorkflow } from '@/features/workflows/hooks/useWorkflows'
import { DragDropBuilder } from '@/features/workflows/components/DragDropBuilder'
import { RunHistoryList } from '@/features/workflows/components/RunHistoryList'
import { ToggleSwitch } from '@/features/workflows/components/ToggleSwitch'
import { Skeleton } from '@/features/workflows/components/Skeleton'
import { ConfirmModal } from '@/features/workflows/components/ConfirmModal'
import { RunDetailDrawer } from '@/features/workflows/drawers/RunDetailDrawer'
import { WorkflowToggle } from '@/features/workflows/components/WorkflowToggle'
import type { Step } from '@/features/workflows/types/workflow'

export function WorkflowDetailClient({ id }: { id: string }) {
  const router = useRouter()
  
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
    <div className="flex h-full flex-col p-8 overflow-y-auto workflow-bg">
      <div className="flex items-center gap-4 mb-6">
        <WorkflowToggle className="p-0 mr-0" />
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 font-motive text-[13px] text-[rgba(255,255,255,0.40)]">
          <Link href="/workflows" className="hover:text-white transition-colors">Workflows</Link>
          <span>/</span>
          <span className="text-white truncate max-w-[200px]">
            {isLoading ? <Skeleton width={100} height={18} /> : workflow?.name}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <Skeleton width="50%" height={40} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton width="100%" height={300} />
            <Skeleton width="100%" height={300} />
          </div>
        </div>
      ) : workflow ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
            <div>
              <h1 className="font-gate text-[24px] text-[#ffffff] font-medium leading-tight mb-2 m-0">
                {workflow.name}
              </h1>
              <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] m-0">
                Created {(() => {
                  const raw = workflow.created_at || workflow.createdAt
                  if (!raw) return '—'
                  const d = new Date(raw)
                  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy')
                })()}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-motive text-[13px] text-[rgba(255,255,255,0.40)]">Active</span>
                <ToggleSwitch 
                  checked={workflow.active} 
                  onChange={handleToggleActive} 
                  loading={isPatching}
                />
              </div>
              <button
                onClick={handleRunNow}
                disabled={isRunning}
                className="font-motive text-[13px] text-[#ffffff] bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.05)] rounded-[8px] px-[16px] py-[8px] transition-colors disabled:opacity-50"
              >
                {isRunning ? 'Starting...' : 'Run Now'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="font-motive text-[13px] text-[rgba(255,100,100,0.70)] hover:text-[rgba(255,100,100,1)] bg-transparent border border-[rgba(255,100,100,0.15)] hover:border-[rgba(255,100,100,0.40)] rounded-[8px] px-[16px] py-[8px] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            
            {/* Left Column: Build / Steps */}
            <div className="flex flex-col gap-6">
              
              {/* Trigger Card */}
              <div className="bg-[#000] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-[#8cdff4]" />
                <h3 className="font-gate text-[16px] text-[#ffffff] font-medium mb-1 pl-2">Trigger</h3>
                
                <div className="mt-4 pl-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="font-motive text-[11px] text-[#8cdff4] border border-[#8cdff4] bg-[rgba(140,223,244,0.08)] rounded-[20px] px-[10px] py-[2px] uppercase">
                    {workflow.trigger_type || workflow.triggerType}
                  </span>
                  <span className="font-mono text-[13px] text-white">
                    {workflow.trigger_value || workflow.triggerValue}
                  </span>
                </div>
                <p className="font-motive text-[13px] text-[rgba(255,255,255,0.40)] mt-2 pl-2">
                  {workflow.trigger_description || workflow.triggerDescription}
                </p>

                {/* Cron: show auto-run status */}
                {(workflow.trigger_type || workflow.triggerType) === 'cron' && (
                  <div className="mt-3 pl-2 flex items-center gap-2">
                    <span className="w-[6px] h-[6px] rounded-full bg-[#10b981] animate-pulse" />
                    <span className="font-motive text-[11px] text-[#10b981]">
                      Auto-running on schedule
                    </span>
                  </div>
                )}

                {/* Event: show webhook URL */}
                {(workflow.trigger_type || workflow.triggerType) === 'event' && (
                  <div className="mt-3 pl-2">
                    <span className="font-motive text-[11px] text-[rgba(255,255,255,0.30)] block mb-1">Webhook URL</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px] text-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[4px] px-2 py-1 truncate max-w-[300px]">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/workflows
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/api/webhooks/workflows`
                          )
                          toast.success('Webhook URL copied!')
                        }}
                        className="font-motive text-[10px] text-[rgba(255,255,255,0.40)] hover:text-white border border-[rgba(255,255,255,0.10)] rounded-[4px] px-2 py-[2px] transition-colors shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="font-motive text-[10px] text-[rgba(255,255,255,0.25)] mt-1">
                      Send POST with {`{"event": "${(workflow.trigger_value || workflow.triggerValue || '').replace('webhook:', '')}"}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Drag & Drop Builder */}
              <div className="bg-[#000] border border-[rgba(255,255,255,0.10)] rounded-[16px] p-6">
                <DragDropBuilder
                  initialSteps={workflow.steps as Step[]}
                  workflowId={id}
                  onSave={(newSteps) => {
                    patchWorkflow(
                      { id, data: { steps: newSteps } as any },
                      {
                        onSuccess: () => toast.success('Steps saved!'),
                        onError: () => toast.error('Failed to save steps'),
                      }
                    )
                  }}
                  isSaving={isPatching}
                />
              </div>

            </div>

            {/* Right Column: Run History */}
            <div className="bg-[#000] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-6 h-full flex flex-col max-h-[800px]">
              <h3 className="font-gate text-[16px] text-[#ffffff] font-medium mb-2 shrink-0">Run History</h3>
              <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                <RunHistoryList 
                  runs={runs} 
                  isLoading={isRunsLoading} 
                  isError={isRunsError} 
                  onRunClick={(runId) => setSelectedRunId(runId)}
                />
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
            message={`Are you sure you want to delete "${workflow?.name}"? This action cannot be undone and will also remove all run history.`}
            confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </>
      ) : null}
    </div>
  )
}
