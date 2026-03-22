'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWorkflows } from '../hooks/useWorkflows'
import { StatusDot } from './StatusDot'
import { Skeleton } from './Skeleton'
import { useWorkflowUIStore } from '../hooks/useCreateWorkflow'

interface WorkflowSidebarListProps {
  userId?: string
}

export function WorkflowSidebarList({ userId = 'temp-user-id' }: WorkflowSidebarListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: workflows, isLoading } = useWorkflows(userId)
  const { setCreateDrawerOpen } = useWorkflowUIStore()

  // Extract ID from pathname: /workflows/[id]
  const currentWorkflowId = pathname.startsWith('/workflows/') ? pathname.split('/')[2] : null

  return (
    <div className="flex h-full flex-col">
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <h2 className="font-gate text-[15px] text-[#ffffff] font-medium m-0">Workflows</h2>
        <button
          onClick={() => setCreateDrawerOpen(true)}
          className="font-motive text-[12px] text-[#3071e1] border border-[#3071e1] bg-transparent rounded-[6px] px-[10px] py-[4px] hover:bg-[rgba(48,113,225,0.08)] transition-colors"
        >
          + New
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto w-full">
        {isLoading && (
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="p-[10px_14px] border-b border-[rgba(255,255,255,0.06)]">
                <Skeleton height={18} width="70%" />
                <div className="mt-2"><Skeleton height={14} width="90%" /></div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && workflows?.length === 0 && (
          <div className="flex h-[200px] flex-col items-center justify-center font-motive text-[13px] text-[rgba(255,255,255,0.40)]">
            <p>No workflows yet</p>
            <button 
              onClick={() => setCreateDrawerOpen(true)}
              className="mt-1 text-[#3071e1] hover:underline"
            >
              + Create one
            </button>
          </div>
        )}

        {!isLoading && workflows && workflows.length > 0 && (
          <div className="flex flex-col">
            {workflows.map((workflow: import('../types/workflow').Workflow) => {
              const isActive = currentWorkflowId === workflow.id
              return (
                <div
                  key={workflow.id}
                  onClick={() => router.push(`/workflows/${workflow.id}`)}
                  className={`
                    flex flex-col gap-1 p-[10px_14px] cursor-pointer border-b border-[rgba(255,255,255,0.06)] transition-colors
                    ${isActive 
                      ? 'bg-[rgba(48,113,225,0.08)] border-l-2 border-l-[#3071e1]' 
                      : 'hover:bg-[rgba(255,255,255,0.03)] border-l-2 border-l-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full overflow-hidden">
                    <span className="font-motive text-[13px] text-[#ffffff] font-medium truncate pr-2">
                      {workflow.name}
                    </span>
                    <div className="shrink-0 flex items-center justify-center">
                      <StatusDot status={workflow.last_run ? workflow.last_run.status : 'never'} />
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="font-motive text-[11px] text-[rgba(255,255,255,0.40)] truncate m-0">
                      {workflow.trigger_description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
