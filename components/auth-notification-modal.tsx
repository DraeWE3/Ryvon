'use client';

import React, { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Check, AlertCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type AuthNotificationType = 'success' | 'error';

interface AuthNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AuthNotificationType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
  loading?: boolean;
  hideIcon?: boolean;
}

export function AuthNotificationModal({ 
  isOpen, 
  onClose, 
  type,
  title,
  message,
  onConfirm,
  confirmText = "Continue",
  onCancel,
  cancelText = "Cancel",
  loading = false,
  hideIcon = false,
}: AuthNotificationModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const isSuccess = type === 'success';

  useGSAP(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const tl = gsap.timeline();
      
      tl.to(overlayRef.current, {
        opacity: 1,
        backdropFilter: 'blur(12px)',
        duration: 0.4,
        ease: 'power2.out',
      })
      .fromTo(modalRef.current, {
        y: 40,
        opacity: 0,
        scale: 0.95,
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.2)',
      }, '-=0.2')

      if (!hideIcon && avatarRef.current) {
        tl.fromTo(avatarRef.current, {
          scale: 0,
          rotation: -45,
        }, {
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.5)',
        }, '-=0.3');
      }

    } else {
      document.body.style.overflow = '';
      
      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          opacity: 0,
          backdropFilter: 'blur(0px)',
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 opacity-0 pointer-events-auto bg-black/60"
      style={{ backdropFilter: 'blur(0px)' }}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] bg-blue-500/10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px] bg-sky-500/10" />
      </div>

      <div 
        ref={modalRef}
        className="relative w-full max-w-[420px] rounded-[2rem] border border-white/10 p-8 overflow-hidden transition-all duration-300"
        style={{ 
          background: 'linear-gradient(to bottom, rgba(0, 111, 191, 0.6), rgba(2, 6, 24, 0.52))',
          boxShadow: '0 0 50px rgba(0, 111, 191, 0.2), inset 0 1px 0 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Animated Avatar / Icon container */}
          {!hideIcon && (
            <div className="relative mb-6" ref={avatarRef}>
              {/* Outer rings */}
              <div className={cn(
                "absolute inset-0 rounded-full border animate-[spin_4s_linear_infinite]",
                isSuccess ? "border-emerald-500/30" : "border-red-500/30"
              )} />
              <div className={cn(
                "absolute inset-[-8px] rounded-full border animate-[spin_6s_linear_infinite_reverse]",
                isSuccess ? "border-teal-500/20" : "border-orange-500/20"
              )} />
              
              {/* Core avatar circle */}
              <div className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-full border shadow-[0_0_30px_rgba(0,125,192,0.3)]",
                isSuccess 
                  ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/40 shadow-emerald-500/20"
                  : "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/40 shadow-red-500/20"
              )}>
                {isSuccess ? (
                  <Check className="h-8 w-8 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-400" />
                )}
              </div>
            </div>
          )}

          <h2 className="mb-2 text-2xl font-gate font-bold text-white tracking-wide">
            {title}
          </h2>
          
          <p className="mb-8 font-motive text-[15px] leading-relaxed text-white/60">
            {message}
          </p>

          <div className="flex w-full flex-row justify-center gap-3">
            {onCancel && (
              <button
                onClick={() => {
                  onClose();
                  onCancel();
                }}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 font-motive text-sm text-white transition-all hover:bg-white/10 disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                // If there's an onCancel, we don't auto-close on confirm, let the caller handle it.
                if (!onCancel) onClose();
                if (onConfirm) onConfirm();
              }}
              disabled={loading}
              className="login-button !m-0 w-full flex items-center justify-center disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md text-center w-full">
                {loading ? (
                  <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  confirmText
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
