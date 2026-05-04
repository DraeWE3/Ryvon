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
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[rgba(0,0,0,0.40)] backdrop-blur-sm transition-opacity" 
        onClick={loading ? undefined : onCancel}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-[501] w-full max-w-[440px] rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#000]/80 backdrop-blur-3xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
      >
        <h2 id="modal-title" className="font-gate text-[20px] text-white font-semibold mb-3 tracking-tight">{title}</h2>
        <p className="font-motive text-[14px] text-[rgba(255,255,255,0.50)] leading-relaxed mb-8">{message}</p>
        
        <div className="flex flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="font-motive text-[13px] font-medium rounded-full border border-[rgba(255,255,255,0.10)] bg-transparent px-6 py-2.5 text-white hover:bg-[rgba(255,255,255,0.05)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center justify-center font-motive text-[13px] font-bold rounded-full bg-red-500/90 hover:bg-red-500 px-8 py-2.5 text-white transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" />
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
