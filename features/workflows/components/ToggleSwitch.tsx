'use client'

import React from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  loading?: boolean
  disabled?: boolean
}

export function ToggleSwitch({ checked, onChange, loading, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[20px] w-[36px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0062FF] ${
        checked ? 'bg-[#0062FF]' : 'bg-[rgba(255,255,255,0.15)]'
      } ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none flex h-[14px] w-[14px] transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-150 ease-in-out mt-[1px] ${
          checked ? 'translate-x-[16px]' : 'translate-x-[2px]'
        }`}
      >
        {loading && (
          <svg className="h-[12px] w-[12px] animate-spin text-[#3071e1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </span>
    </button>
  )
}
