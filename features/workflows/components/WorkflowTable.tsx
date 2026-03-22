'use client'

import React from 'react'
import type { Workflow } from '../types/workflow'
import { WorkflowRow } from './WorkflowRow'
import { Skeleton } from './Skeleton'

interface WorkflowTableProps {
  workflows?: Workflow[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export function WorkflowTable({ workflows, isLoading, isError, onRetry }: WorkflowTableProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[#000]">
        <p className="font-motive text-[14px] text-[rgba(255,100,100,0.90)] mb-4">
          Failed to load workflows
        </p>
        <button 
          onClick={onRetry}
          className="font-motive text-[13px] text-[#ffffff] bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.15)] rounded-[8px] px-[16px] py-[8px]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col">
      {/* Table Header */}
      <div className="flex items-center h-[40px] border-b border-[rgba(255,255,255,0.08)] font-motive text-[11px] text-[rgba(255,255,255,0.45)] uppercase tracking-[0.05em] pl-4">
        <div className="flex-[2] min-w-0 pr-4">Name</div>
        <div className="flex-[1] min-w-[100px] pr-4">Trigger</div>
        <div className="flex-[1.5] min-w-[120px] pr-4">Last Run</div>
        <div className="flex-[1] min-w-[100px] pr-4">Status</div>
        <div className="flex-[1] min-w-[80px] pr-4">Active</div>
        <div className="flex-[1] min-w-[120px] pr-4 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="flex flex-col w-full">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-row-${i}`} className="flex items-center h-[52px] border-b border-[rgba(255,255,255,0.06)] pl-4">
              <div className="flex-[2] pr-4"><Skeleton height={20} width="80%" /></div>
              <div className="flex-[1] pr-4"><Skeleton height={20} width="60px" borderRadius={10} /></div>
              <div className="flex-[1.5] pr-4"><Skeleton height={20} width="50%" /></div>
              <div className="flex-[1] pr-4"><Skeleton height={8} width={8} borderRadius={4} /></div>
              <div className="flex-[1] pr-4"><Skeleton height={20} width={36} borderRadius={10} /></div>
              <div className="flex-[1] pr-4 text-right"></div>
            </div>
          ))
        ) : workflows?.length === 0 ? (
          // Empty State (Triggered by parent generally, but fallback here)
          <div className="flex flex-col items-center justify-center py-[64px] rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[#000] mt-4">
            <h3 className="font-gate text-[18px] text-[#ffffff] mb-1">No workflows yet</h3>
            <p className="font-motive text-[13px] text-[rgba(255,255,255,0.45)] mb-6">Create your first workflow to get started</p>
          </div>
        ) : (
          workflows?.map((workflow) => (
            <WorkflowRow key={workflow.id} workflow={workflow} />
          ))
        )}
      </div>
    </div>
  )
}
