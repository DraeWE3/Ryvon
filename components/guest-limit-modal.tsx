'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { LogIn, X, UserRound } from 'lucide-react';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuestLimitModal({ isOpen, onClose }: GuestLimitModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

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
      .fromTo(avatarRef.current, {
        scale: 0,
        rotation: -45,
      }, {
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      }, '-=0.3');

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

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 opacity-0 pointer-events-auto bg-black/60"
      style={{ backdropFilter: 'blur(0px)' }}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div 
        ref={modalRef}
        className="relative w-full max-w-[420px] rounded-3xl border border-white/10 bg-[#0A0D14]/90 p-8 shadow-[0_0_50px_rgba(0,125,192,0.15)] overflow-hidden"
        style={{ 
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
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
          <div className="relative mb-6" ref={avatarRef}>
            {/* Outer rings */}
            <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-[spin_4s_linear_infinite]" />
            <div className="absolute inset-[-8px] rounded-full border border-cyan-500/20 animate-[spin_6s_linear_infinite_reverse]" />
            
            {/* Core avatar circle */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/40 shadow-[0_0_30px_rgba(0,125,192,0.3)]">
              <UserRound className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-gate font-bold text-white tracking-wide">
            Daily Limit Reached
          </h2>
          
          <p className="mb-8 font-motive text-[15px] leading-relaxed text-white/60">
            You've experienced what Ryvon can do. Sign in or create a free account to continue chatting and unlock premium intelligence features.
          </p>

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => {
                onClose();
                router.push('/register');
              }}
              className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white text-black font-gate font-bold text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-cyan-100 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative z-10 flex items-center gap-2">
                Continue with Account <LogIn size={16} />
              </span>
            </button>
            
            <button
              onClick={onClose}
              className="h-10 text-[13px] font-motive text-white/40 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
