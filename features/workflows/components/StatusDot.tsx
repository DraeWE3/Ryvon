'use client'

import React from 'react'

interface StatusDotProps {
  status: 'success' | 'running' | 'failed' | 'pending' | 'never' | 'cancelled'
}

export function StatusDot({ status }: StatusDotProps) {
  if (status === 'never') {
    return <span className="font-motive text-[rgba(255,255,255,0.45)]">—</span>
  }

  let bgClass = ''
  let animationClass = ''

  switch (status) {
    case 'success':
      bgClass = 'bg-[#8cdff4]'
      break
    case 'running':
      bgClass = 'bg-[#3071e1]'
      animationClass = 'animate-pulse' // Use tailwind's built-in pulse (which does opacity 1->0.5)
      break
    case 'failed':
      bgClass = 'bg-[rgba(255,255,255,0.25)]'
      break
    case 'pending':
      bgClass = 'bg-[rgba(255,255,255,0.15)]'
      break
  }

  return (
    <div
      className={`w-2 h-2 rounded-full ${bgClass} ${animationClass}`}
      style={
        status === 'running'
          ? { animation: 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }
          : undefined
      }
    />
  )
}
