'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export default function ComingSoonOverlay({ children }: { children: React.ReactNode }) {
  // Start unlocked if localStorage says so — avoids flash of overlay
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ryvon_unlocked') !== 'true';
    }
    return true;
  });
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Double-check localStorage on mount (SSR safety)
    const unlocked = localStorage.getItem('ryvon_unlocked');
    if (unlocked === 'true') {
      setIsLocked(false);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('ryvon_unlocked', 'true');
        setIsLocked(false);
      } else {
        setError(data.error || 'Incorrect developer password');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#02060c] overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/img/chat-bg.webp')] bg-cover bg-center opacity-40 mix-blend-overlay" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1EA7FF]/20 via-[#1EA7FF]/5 to-transparent blur-2xl pointer-events-none" />
            
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="relative w-full max-w-md px-8 flex flex-col items-center"
            >
              {/* Logo / Icon Area */}
              <div className="mb-10 relative">
                <div className="w-24 h-24 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(30,167,255,0.15)] relative z-10 overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-[#1EA7FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <img src="/favicon.webp" alt="Ryvon AI" className="w-12 h-12 relative z-10" />
                </div>
                {/* Glowing ring */}
                <div className="absolute inset-0 -m-4 border border-[#1EA7FF]/20 rounded-[2.5rem] blur-md animate-pulse" />
              </div>

              {/* Text Content */}
              <div className="text-center mb-10">
                <h1 className="font-nasa text-3xl sm:text-4xl text-white mb-4 tracking-tight uppercase">
                  Coming Soon
                </h1>
                <p className="font-motive text-[15px] text-gray-400 leading-relaxed">
                  Ryvon Intelligence is currently in private development. 
                  Access is restricted to authorized engineers and stakeholders.
                </p>
              </div>

              {/* Password Form */}
              <form 
                onSubmit={handleVerify}
                className="w-full space-y-4"
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-500 group-focus-within:text-[#1EA7FF] transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Developer Access Key"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-full py-4 pl-12 pr-14 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-[#1EA7FF]/50 focus:bg-white/[0.05] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isVerifying || !password}
                    className="absolute right-2 top-2 bottom-2 w-10 rounded-full bg-[#1EA7FF] flex items-center justify-center text-white shadow-[0_0_15px_rgba(30,167,255,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center"
                    >
                      <p className="text-[11px] font-bold text-red-500/80 uppercase tracking-widest bg-red-500/5 py-2 px-4 rounded-full border border-red-500/10 inline-block">
                        {error}
                      </p>
                    </motion.div>
                  )}
                  {!error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                        <ShieldCheck className="w-3 h-3" /> Secure Infrastructure
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Footer */}
              <div className="mt-16 text-center">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
                  &copy; 2026 Ryvon AI Corp. All Rights Reserved.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
