'use client'

import React from 'react'
import { formatDistanceToNow, format, differenceInMilliseconds } from 'date-fns'
import type { Run } from '../types/run'

interface RunItemProps {
  run: Run
  onClick: () => void
}

export function RunItem({ run, onClick }: RunItemProps) {
  const shortId = run.id.slice(0, 8) + '...'
  
  // Safely parse dates, handling both camelCase and snake_case field names
  const startedRaw = (run as any).started_at || (run as any).startedAt
  const completedRaw = (run as any).completed_at || (run as any).completedAt
  const triggeredBy = (run as any).triggered_by || (run as any).triggeredBy || 'manual'

  const startedDate = startedRaw ? new Date(startedRaw) : null
  const completedDate = completedRaw ? new Date(completedRaw) : null

  const startedText = startedDate && !isNaN(startedDate.getTime())
    ? formatDistanceToNow(startedDate, { addSuffix: true })
    : '—'
  
  let durationText = '—'
  if (completedDate && startedDate && !isNaN(completedDate.getTime()) && !isNaN(startedDate.getTime())) {
    const ms = differenceInMilliseconds(completedDate, startedDate)
    durationText = `${(ms / 1000).toFixed(1)}s`
  } else if (run.status === 'running') {
    durationText = 'Running...'
  }

  // Status coloring
  let statusColor = 'text-[rgba(255,255,255,0.45)]'
  if (run.status === 'success') statusColor = 'text-[#8cdff4]'
  else if (run.status === 'failed') statusColor = 'text-[rgba(255,100,100,0.90)]'
  else if (run.status === 'running') statusColor = 'text-[#3071e1]'

  return (
    <div 
      onClick={onClick}
      className="flex flex-col py-[12px] border-b border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors px-2 -mx-2 rounded-md"
    >
      {/* Row 1 */}
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[11px] text-[rgba(255,255,255,0.40)]">
          {shortId}
        </span>
        <span className={`font-motive text-[12px] capitalize ${statusColor}`}>
          {run.status}
        </span>
      </div>
      
      {/* Row 2 */}
      <div className="flex justify-between items-center mb-1">
        <span className="font-motive text-[12px] text-[rgba(255,255,255,0.45)]">
          Triggered by {triggeredBy}
        </span>
        <span className="font-motive text-[12px] text-[rgba(255,255,255,0.45)]">
          {durationText}
        </span>
      </div>

      {/* Row 3 */}
      <div className="flex justify-start">
        <span className="font-motive text-[11px] text-[rgba(255,255,255,0.40)]">
          {startedText}
        </span>
      </div>
    </div>
  )
}
