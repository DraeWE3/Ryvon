'use client'

import React from 'react'
import type { Run } from '../types/run'
import { RunItem } from './RunItem'
import { Skeleton } from './Skeleton'

interface RunHistoryListProps {
  runs?: Run[]
  isLoading: boolean
  isError: boolean
  onRunClick: (runId: string) => void
}

export function RunHistoryList({ runs, isLoading, isError, onRunClick }: RunHistoryListProps) {
  if (isError) {
    return (
      <div className="py-4 text-center">
        <span className="font-motive text-[13px] text-[rgba(255,100,100,0.80)]">
          Failed to load run history
        </span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`run-skel-${i}`} className="py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex justify-between mb-2">
              <Skeleton width="40%" height={14} />
              <Skeleton width="20%" height={14} />
            </div>
            <Skeleton width="60%" height={12} />
          </div>
        ))}
      </div>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="py-8 text-center text-[rgba(255,255,255,0.40)] font-motive text-[13px]">
        No runs recorded yet
      </div>
    )
  }

  return (
    <div className="flex flex-col mt-2">
      {runs.map((run) => (
        <RunItem key={run.id} run={run} onClick={() => onRunClick(run.id)} />
      ))}
    </div>
  )
}
