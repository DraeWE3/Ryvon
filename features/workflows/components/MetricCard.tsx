'use client'

import React from 'react'
import { Skeleton } from './Skeleton'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: string
  loading?: boolean
}

export function MetricCard({ label, value, trend, loading }: MetricCardProps) {
  const isUp = trend?.startsWith('+')
  const isZero = trend === '0.0%'
  
  return (
    <div
      className="animate-bg-shift flex flex-col justify-between border border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.12)] rounded-[20px] p-[24px] min-h-[140px] relative overflow-hidden group hover:border-[rgba(0,111,191,0.5)] transition-all shadow-lg shadow-black/50"
      style={{ 
        background: 'linear-gradient(135deg, rgba(22, 60, 115, 0.95) 0%, rgba(8, 20, 45, 0.9) 45%, rgba(4, 9, 20, 1) 100%)'
      }}
    >
      {/* Subtle top-right glow matching the image's lighting effect */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[rgba(60,160,255,0.15)] blur-[50px] rounded-full group-hover:bg-[rgba(60,160,255,0.25)] transition-all duration-500" />
      
      {/* Label */}
      <span className="font-motive text-[15px] text-[rgba(255,255,255,0.65)] font-medium mb-4 relative z-10 tracking-wide">
        {label}
      </span>
      
      {/* Values & Trend Container */}
      <div className="flex items-end justify-between w-full relative z-10 mt-2">
        {loading ? (
          <Skeleton height={44} width={100} />
        ) : (
          <span className="font-gate text-[40px] text-white font-bold tracking-tight leading-none drop-shadow-sm">
            {value}
          </span>
        )}
        
        {trend && (
          <div className="flex flex-col items-end pb-1">
             {isZero ? (
               <div className="text-[#9CA3AF] drop-shadow-[0_0_8px_rgba(156,163,175,0.4)] mb-[2px] font-bold text-[16px] leading-none text-center">
                 —
               </div>
             ) : isUp ? (
               <TrendingUp size={22} strokeWidth={2.5} className="text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.4)] mb-[2px]" />
             ) : (
               <TrendingDown size={22} strokeWidth={2.5} className="text-[#FF5252] drop-shadow-[0_0_8px_rgba(255,82,82,0.4)] mb-[2px]" />
             )}
             <span className={`font-motive text-[14px] font-medium tracking-wide ${isZero ? 'text-[#9CA3AF]' : isUp ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                {trend}
             </span>
          </div>
        )}
      </div>
    </div>
  )
}
