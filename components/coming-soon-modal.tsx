"use client";

import React from 'react';
import { toast } from 'sonner';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  featureName: string;
  iconPath?: string;
}

export function ComingSoonModal({ isOpen, onClose, title, description, featureName, iconPath }: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 shadow-2xl" 
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col items-center text-center rounded-[2rem] p-8 max-w-sm w-[90%] border border-white/10 shadow-[0_0_50px_rgba(0,111,191,0.2)] transition-all duration-300"
        style={{ background: 'linear-gradient(to bottom, rgba(0, 111, 191, 0.6), rgba(2, 6, 24, 0.52))' }}
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={iconPath || "/images/voice-cs.svg"} 
          alt="Coming Soon" 
          className="w-16 h-16 mb-6" 
        />
        
        <h2 
          className="text-xl font-medium text-white mb-4" 
          style={{ fontFamily: 'motive-reg' }}
        >
          {title}
        </h2>
        
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          {description}
        </p>

        <div className="flex gap-4 w-full">
          <button 
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 text-white font-medium hover:bg-white/10 transition-colors shadow-lg active:scale-95 transition-transform" 
            onClick={() => {
              onClose();
              toast.success(`Priority access enabled! We'll alert you as soon as ${featureName} goes live.`);
            }}
          >
            Notify Me
          </button>
          
          <button 
            className="flex-1 py-3 px-4 rounded-xl bg-[#090C15] border border-white/5 text-white font-medium hover:bg-white/5 transition-colors shadow-lg active:scale-95 transition-transform" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
