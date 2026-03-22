'use client'

import React from 'react'

interface SkeletonProps {
  height: string | number
  width?: string | number
  borderRadius?: string | number
}

export function Skeleton({ height, width = '100%', borderRadius = '8px' }: SkeletonProps) {
  return (
    <div
      className="relative overflow-hidden bg-[rgba(255,255,255,0.06)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[rgba(255,255,255,0.04)] before:to-transparent"
      style={{
        height,
        width,
        borderRadius,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}
