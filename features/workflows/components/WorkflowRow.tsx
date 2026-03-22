'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import type { Workflow } from '../types/workflow'
import { StatusDot } from './StatusDot'
import { ToggleSwitch } from './ToggleSwitch'
import { ConfirmModal } from './ConfirmModal'
import { usePatchWorkflow, useDeleteWorkflow, useRunWorkflow } from '../hooks/useWorkflows'

interface WorkflowRowProps {
  workflow: Workflow
}

export function WorkflowRow({ workflow }: WorkflowRowProps) {
  const router = useRouter()
  const { mutate: patchWorkflow, isPending: isPatching } = usePatchWorkflow()
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow()
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow()
  
  const [isConfirmOpen, setConfirmOpen] = useState(false)

  const handleRowClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="switch"]') || target.closest('svg')) {
      return
    }
    router.push(`/workflows/${workflow.id}`)
  }

  const handleToggleActive = (checked: boolean) => {
    patchWorkflow(
      { id: workflow.id, data: { active: checked } },
      {
        onError: () => toast.error('Failed to update workflow status'),
      }
    )
  }

  const handleRun = () => {
    runWorkflow(workflow.id, {
      onSuccess: () => toast.success('Workflow started'),
      onError: () => toast.error('Failed to start workflow'),
    })
  }

  const handleDelete = () => {
    deleteWorkflow(workflow.id, {
      onSuccess: () => {
        toast.success('Workflow deleted')
        setConfirmOpen(false)
      },
      onError: () => toast.error('Failed to delete workflow')
    })
  }

  const lastRunTime = workflow.last_run
    ? formatDistanceToNow(new Date(workflow.last_run.started_at), { addSuffix: true })
    : 'Never'

  return (
    <>
      <div 
        onClick={handleRowClick}
        className="group flex items-center h-[52px] border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
      >
        {/* Name Cell */}
        <div className="flex-[2] min-w-0 pr-4 pl-4 flex flex-col justify-center">
          <div className="font-motive text-[14px] text-[#ffffff] font-medium truncate">
            {workflow.name}
          </div>
          <div className="font-motive text-[11px] text-[rgba(255,255,255,0.40)] truncate">
            {workflow.trigger_description}
          </div>
        </div>

        {/* Trigger Cell */}
        <div className="flex-[1] min-w-[100px] pr-4 flex items-center">
          <span className="font-motive text-[11px] text-[#8cdff4] border border-[#8cdff4] bg-transparent rounded-[20px] px-[10px] py-[2px] uppercase">
            {workflow.trigger_type}
          </span>
        </div>

        {/* Last Run Cell */}
        <div className="flex-[1.5] min-w-[120px] pr-4 flex items-center font-motive text-[13px] text-[rgba(255,255,255,0.45)]">
          {lastRunTime}
        </div>

        {/* Status Cell */}
        <div className="flex-[1] min-w-[100px] pr-4 flex items-center justify-start">
          <StatusDot status={workflow.last_run ? workflow.last_run.status : 'never'} />
        </div>

        {/* Active Cell */}
        <div className="flex-[1] min-w-[80px] pr-4 flex items-center">
          <ToggleSwitch 
            checked={workflow.active} 
            onChange={handleToggleActive} 
            loading={isPatching}
          />
        </div>

        {/* Actions Cell */}
        <div className="flex-[1] min-w-[120px] pr-4 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="font-motive text-[11px] text-[#3071e1] border border-[#3071e1] bg-transparent rounded-[6px] px-[10px] py-[3px] hover:bg-[rgba(48,113,225,0.08)] disabled:opacity-50"
          >
            {isRunning ? '...' : 'Run'}
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="text-[rgba(255,255,255,0.30)] hover:text-[#ffffff] transition-colors p-1"
            title="Delete workflow"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <ConfirmModal
        open={isConfirmOpen}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isDeleting}
      />
    </>
  )
}
