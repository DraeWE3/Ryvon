'use client'

import React from 'react'
import type { Step } from '../types/workflow'

interface StepTimelineProps {
  steps: Step[]
  compact?: boolean
}

export function StepTimeline({ steps, compact = false }: StepTimelineProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="font-motive text-[13px] text-[rgba(255,255,255,0.40)] italic">
        No steps defined
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-[3px] top-[10px] bottom-[10px] w-[1px] bg-[rgba(255,255,255,0.10)]" />
      
      <div className={`flex flex-col ${compact ? 'gap-4' : 'gap-6'}`}>
        {steps.map((step, index) => (
          <div key={step.id || index} className="relative flex items-start">
            {/* Timeline Dot */}
            <div className={`absolute left-0 w-[8px] h-[8px] rounded-full bg-[#3071e1] ${compact ? 'top-[4px]' : 'top-[6px]'}`} />
            
            {/* Content */}
            <div className="ml-[20px] flex flex-col">
              <span className="font-motive text-[11px] text-[#8cdff4] uppercase tracking-wider mb-1">
                {step.agent}
              </span>
              <span className="font-motive text-[14px] text-[#ffffff] font-medium leading-tight">
                {step.action}
              </span>
              
              {!compact && step.params && Object.keys(step.params).length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {Object.entries(step.params).map(([key, value]) => (
                    <div key={key} className="font-motive text-[12px] text-[rgba(255,255,255,0.40)]">
                      <span className="text-[rgba(255,255,255,0.60)]">{key}:</span>{' '}
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
