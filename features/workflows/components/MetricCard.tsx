'use client'

import React from 'react'
import { Skeleton } from './Skeleton'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: string
  loading?: boolean
}

export function MetricCard({ label, value, trend, loading }: MetricCardProps) {
  return (
    <div
      className="flex flex-col justify-between border border-[rgba(255,255,255,0.10)] rounded-[12px] p-[20px_24px] h-[120px]"
      style={{ background: 'linear-gradient(to top, rgba(0,98,255,0.25) 0%, #000000 20%)' }}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-motive text-[11px] text-[rgba(255,255,255,0.45)] uppercase tracking-[0.06em]">
          {label}
        </span>
        {trend && (
          <span className="font-motive text-[12px] text-[#8cdff4]">
            {trend}
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <Skeleton height={34} width={80} />
        ) : (
          <span className="font-gate text-[28px] text-[#ffffff] font-medium leading-none">
            {value}
          </span>
        )}
      </div>
    </div>
  )
}
