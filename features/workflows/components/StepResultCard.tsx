'use client'

import React, { useState } from 'react'
import type { StepResult } from '../types/run'

interface StepResultCardProps {
  n: number
  result: StepResult
}

// Inline SVGs for status
const SuccessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8cdff4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
)

const FailedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,80,80,0.80)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
)

const RunningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3071e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-[spin_1s_linear_infinite]">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
)

const PendingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

export function StepResultCard({ n, result }: StepResultCardProps) {
  const [showOutput, setShowOutput] = useState(false)

  const renderIcon = () => {
    switch (result.status) {
      case 'success': return <SuccessIcon />
      case 'failed': return <FailedIcon />
      case 'running': return <RunningIcon />
      case 'pending':
      default: return <PendingIcon />
    }
  }

  const hasOutput = result.output !== undefined && result.output !== null
  const durationText = result.duration_ms ? `${(result.duration_ms / 1000).toFixed(1)}s` : ''

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-[14px] mb-[8px] flex flex-col">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-motive text-[11px] text-[rgba(255,255,255,0.40)]">
          Step {n}
        </span>
        <span className="font-motive text-[11px] text-[#8cdff4] uppercase tracking-wider text-center flex-1">
          {result.agent}
        </span>
        <div className="shrink-0 flex items-center justify-center">
          {renderIcon()}
        </div>
      </div>

      {/* Action Row */}
      <div className="font-motive text-[14px] text-[#ffffff] font-medium mb-1">
        {result.action}
      </div>

      {/* Meta Row: Duration and Output Toggle */}
      <div className="flex justify-between items-center mt-2">
        <span className="font-motive text-[11px] text-[rgba(255,255,255,0.40)]">
          {durationText}
        </span>
        
        {hasOutput && (
          <button 
            onClick={() => setShowOutput(!showOutput)}
            className="font-motive text-[12px] text-[#3071e1] hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            {showOutput ? 'Hide output' : 'Show output'}
          </button>
        )}
      </div>

      {/* Error State */}
      {result.error && (
        <div className="mt-3 font-motive text-[12px] text-[rgba(255,100,100,0.90)] bg-[rgba(255,100,100,0.05)] p-2 rounded">
          {result.error}
        </div>
      )}

      {/* Output Area */}
      {showOutput && hasOutput && (
        <div className="mt-3 bg-[rgba(255,255,255,0.04)] rounded-[6px] p-[10px] max-h-[200px] overflow-y-auto">
          <pre className="font-mono text-[12px] text-[rgba(255,255,255,0.70)] whitespace-pre-wrap m-0">
            {typeof result.output === 'object' 
              ? JSON.stringify(result.output, null, 2) 
              : String(result.output)}
          </pre>
        </div>
      )}
    </div>
  )
}
