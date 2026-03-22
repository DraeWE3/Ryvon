'use client'

import React, { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[rgba(0,0,0,0.70)] transition-opacity" 
        onClick={loading ? undefined : onCancel}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-[101] w-full max-w-[400px] rounded-[12px] border border-[rgba(255,255,255,0.15)] bg-[#000] p-[24px] shadow-xl"
      >
        <h2 id="modal-title" className="font-gate text-[16px] text-[#ffffff] mb-2">{title}</h2>
        <p className="font-motive text-[13px] text-[rgba(255,255,255,0.50)]">{message}</p>
        
        <div className="mt-[20px] flex flex-row items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="font-motive rounded-[8px] border border-[rgba(255,255,255,0.15)] bg-transparent px-[16px] py-[8px] text-[#ffffff] hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center justify-center font-motive rounded-[8px] bg-[rgba(220,50,50,0.85)] px-[16px] py-[8px] text-[#ffffff] hover:bg-[rgba(220,50,50,1)] disabled:opacity-50 min-w-[80px]"
          >
            {loading ? (
              <svg className="h-[14px] w-[14px] animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
