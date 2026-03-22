'use client'

import React, { useEffect } from 'react'
import { format } from 'date-fns'
import { useRunDetail } from '../hooks/useWorkflowDetail'
import { useRunSSE } from '../hooks/useRunSSE'
import { StepResultCard } from '../components/StepResultCard'
import { Skeleton } from '../components/Skeleton'

interface RunDetailDrawerProps {
  runId: string | null
  onClose: () => void
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export function RunDetailDrawer({ runId, onClose }: RunDetailDrawerProps) {
  // Use TanStack to fetch base run detail
  const { data: run, isLoading, isError } = useRunDetail(runId)
  
  // Use SSE strictly for active updates. liveRunData overrides fetched state if present.
  const liveRunData = useRunSSE(run?.status === 'running' ? runId : null)

  const displayRun = liveRunData ? { ...run, ...liveRunData } : run

  useEffect(() => {
    if (runId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [runId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && runId) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [runId, onClose])

  if (!runId) return null

  // Meta formatting
  let startedText = ''
  let metaInfo = ''
  
  if (displayRun?.started_at) {
    startedText = format(new Date(displayRun.started_at), 'MMM d, HH:mm')
    
    let durationText = 'Running...'
    if (displayRun.completed_at) {
      const ms = new Date(displayRun.completed_at).getTime() - new Date(displayRun.started_at).getTime()
      durationText = `${(ms / 1000).toFixed(1)}s`
    }

    metaInfo = `Triggered by ${displayRun.triggered_by}  ·  Started ${startedText}  ·  ${durationText}`
  }

  // Status color header
  let statusColor = 'text-[rgba(255,255,255,0.45)]'
  if (displayRun?.status === 'success') statusColor = 'text-[#8cdff4]'
  else if (displayRun?.status === 'failed') statusColor = 'text-[rgba(255,100,100,0.90)]'
  else if (displayRun?.status === 'running') statusColor = 'text-[#3071e1]'


  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[rgba(0,0,0,0.60)] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className="relative z-[201] w-[520px] max-w-full h-full bg-[#000] border-l border-[rgba(255,255,255,0.10)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.10)]">
          <div className="flex items-center gap-3">
            <h2 className="font-gate text-[16px] text-[#ffffff] m-0">
              Run {runId.slice(0, 14)}...
            </h2>
            {displayRun && (
              <span className={`font-motive text-[12px] capitalize ${statusColor}`}>
                {displayRun.status}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-[rgba(255,255,255,0.50)] hover:text-[#ffffff] transition-colors p-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {isLoading && (
            <div className="flex flex-col gap-4">
              <Skeleton width="100%" height={24} />
              <Skeleton width="100%" height={120} />
              <Skeleton width="100%" height={120} />
            </div>
          )}

          {isError && (
            <div className="text-center font-motive text-[13px] text-[rgba(255,100,100,0.90)]">
              Failed to load run details.
            </div>
          )}

          {!isLoading && !isError && displayRun && (
            <div className="flex flex-col animate-in fade-in duration-300">
              {/* Meta Row */}
              <div className="font-motive text-[12px] text-[rgba(255,255,255,0.45)] mb-6 whitespace-pre">
                {metaInfo}
              </div>

              {/* Steps List */}
              <div className="flex flex-col gap-2">
                {displayRun.step_results && displayRun.step_results.length > 0 ? (
                  displayRun.step_results.map((result: any, index: number) => (
                    <StepResultCard key={result.step_id || index} n={index + 1} result={result} />
                  ))
                ) : (
                  <div className="font-motive text-[13px] text-[rgba(255,255,255,0.40)] text-center py-8">
                    No steps executed yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
