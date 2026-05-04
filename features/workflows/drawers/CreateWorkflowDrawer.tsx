'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { useWorkflowUIStore, useCreateWorkflow } from '../hooks/useCreateWorkflow'
import { StepTimeline } from '../components/StepTimeline'
import { useGSAP } from '@gsap/react'
import { drawerEnter } from '@/lib/animations/timelines'
import { useSpeechToText } from '@/hooks/use-speech-to-text'

import { Sparkles, Mic, X, ChevronRight } from 'lucide-react'

export function CreateWorkflowDrawer({ onWorkflowCreated }: { onWorkflowCreated?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const { isCreateDrawerOpen, setCreateDrawerOpen } = useWorkflowUIStore()
  const { mutate: generateWorkflow, isPending } = useCreateWorkflow()
  const queryClient = useQueryClient()
  
  const [input, setInput] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: prompt, 2: generating, 3: preview
  const [previewData, setPreviewData] = useState<any>(null)
  
  const { isListening, transcript, toggle } = useSpeechToText()

  useEffect(() => {
    if (transcript) {
      setInput((prev) => {
        const base = prev.trim()
        return base ? `${base} ${transcript}` : transcript
      })
    }
  }, [transcript, setInput])

  const drawerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height temporarily to get accurate scrollHeight
      textarea.style.height = '140px'
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, 140), 170)
      textarea.style.height = `${newHeight}px`
      // If we are at max height, ensure overflow is allowed and the browser handles the scroll state
    }
  }

  useEffect(() => {
    if (input) {
      adjustHeight()
    }
  }, [input])

  useGSAP(() => {
    if (drawerRef.current && contentRef.current && step === 1) {
      drawerEnter(drawerRef.current, contentRef.current.children)
    }
  }, { scope: drawerRef, dependencies: [step] })

  useEffect(() => {
    if (isCreateDrawerOpen) {
      document.body.style.overflow = 'hidden'
      setStep(1)
      setInput('')
      setPreviewData(null)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isCreateDrawerOpen])

  if (!isCreateDrawerOpen) return null

  const handleGenerate = () => {
    if (session?.user?.type === 'guest') {
      toast.error('Sign in to generate intelligent workflows!')
      router.push('/register')
      setCreateDrawerOpen(false)
      return
    }
    if (!input.trim()) return
    setStep(2)
    generateWorkflow(input, {
      onSuccess: (data) => {
        setPreviewData(data)
        setStep(3)
      },
      onError: () => setStep(1)
    })
  }

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] })
    toast.success('Workflow saved')
    setCreateDrawerOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => step !== 2 && setCreateDrawerOpen(false)}
      />

      {/* Drawer Content */}
      <div 
        ref={drawerRef}
        className="relative z-[501] w-full max-w-[540px] h-full border-l border-[rgba(255,255,255,0.06)] shadow-[-20px_0_100px_rgba(0,111,191,0.15)] flex flex-col p-8 overflow-y-auto custom-scrollbar"
        style={{ 
          background: 'linear-gradient(160deg, #020409 0%, #061430 45%, #010204 100%)'
        }}
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#006FBF]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#1EA7FF]/5 rounded-full blur-[100px] pointer-events-none" />
        <div ref={contentRef} className="flex flex-col h-full w-full relative z-10">
        {/* Header Navigation */}
        <div className="flex items-center justify-between w-full mb-10">
          <button 
            onClick={() => setCreateDrawerOpen(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
          >
            <ChevronRight size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-motive font-medium text-[13px]">Back</span>
          </button>
        </div>

        <div className="flex flex-col flex-1">
          <h2 className="text-[28px] text-white font-gate font-semibold tracking-tight mb-8">Create New Automation</h2>

          <style dangerouslySetInnerHTML={{ __html: `
            .ai-textarea-scroll::-webkit-scrollbar {
              width: 8px !important;
              height: 8px !important;
              display: block !important;
            }
            .ai-textarea-scroll::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.02) !important;
              border-radius: 10px !important;
            }
            .ai-textarea-scroll::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3) !important;
              border-radius: 10px !important;
              border: 2px solid transparent !important;
              background-clip: content-box !important;
            }
            .ai-textarea-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5) !important;
              background-clip: content-box !important;
            }
          `}} />

          {step === 1 && (
            <div className="w-full flex flex-col gap-10">
              <div className="w-full text-left">
                <h3 className="text-[16px] text-white/90 font-gate font-medium mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-[#1EA7FF]" />
                  Generate With AI
                </h3>
                
                <div className="relative group flex flex-col bg-[#060A16] border border-[rgba(255,255,255,0.04)] rounded-[20px] focus-within:border-[rgba(0,111,191,0.5)] focus-within:shadow-[0_0_15px_rgba(0,111,191,0.2)] transition-all">
                   <div className="w-full p-5 pb-0">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='Describe your automation workflow... e.g., "Send a weekly email summary of new HubSpot leads."'
                        className="ai-textarea-scroll w-full bg-transparent px-4 py-2 overflow-y-scroll text-white text-[15px] font-motive leading-relaxed resize-none focus:outline-none placeholder-white/30"
                        style={{ minHeight: '140px' }}
                        autoFocus
                      />
                   </div>
                  
                  {/* Bottom Action Group */}
                  <div className="flex items-center justify-between p-3 px-4 bg-white/[0.01] border-t border-[rgba(255,255,255,0.02)]">
                    <div className="relative flex items-center justify-center">
                      {/* Sound Wave Rings */}
                      {isListening && (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-[#1EA7FF]/40 animate-ping" style={{ animationDuration: '1.5s' }} />
                          <div className="absolute inset-0 rounded-full border-2 border-[#1EA7FF]/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                        </>
                      )}
                      <button 
                         onClick={() => {
                            if (session?.user?.type === 'guest') {
                              toast.error('Sign in to use voice features!');
                              return;
                            }
                            toggle();
                         }}
                         className={`relative z-10 flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all cursor-pointer group/mic bg-[#03060C] border ${
                           isListening 
                             ? "border-[rgba(0,111,191,0.8)] shadow-[0_0_20px_rgba(0,111,191,0.6)]" 
                             : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]"
                         }`}
                         title={isListening ? "Stop Recording" : "Start Voice Input"}
                      >
                         <img 
                           src="/img/mic.svg" 
                           alt="mic" 
                           className={`w-5 h-5 transition-transform ${isListening ? "scale-110 brightness-150" : "group-hover/mic:scale-110"}`} 
                         />
                      </button>
                    </div>
                    
                    <button 
                       onClick={handleGenerate}
                       disabled={!input.trim() || isPending}
                       className="group/btn flex items-center gap-2 px-6 h-[40px] rounded-full text-white font-gate text-[13px] font-bold border border-[rgba(0,111,191,0.6)] hover:border-[rgba(0,111,191,0.9)] disabled:opacity-50 disabled:hover:border-[rgba(0,111,191,0.6)] transition-all bg-[#03060C]"
                       style={{ 
                         boxShadow: '0 0 15px rgba(0, 111, 191, 0.4), inset 0 0 10px rgba(0, 111, 191, 0.4)'
                       }}
                    >
                       Generate <Sparkles size={14} className="group-hover/btn:rotate-12 transition-transform text-[#A8CEE5]" />
                    </button>
                  </div>
                </div>

                {/* AI Prompt Suggestions */}
                <div className="mt-8 animate-in fade-in duration-500">
                  <p className="text-[12px] font-motive text-white/40 mb-3 uppercase tracking-wider font-medium">Popular Suggestions</p>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      "Sync new HubSpot leads to Sheets",
                      "Post a Slack alert for every Stripe charge",
                      "Draft and send a welcome email",
                      "Create a Jira ticket from support emails"
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[rgba(255,255,255,0.5)] font-motive text-[13px] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(0,111,191,0.4)] hover:text-[#A8CEE5] transition-all text-left shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center w-full my-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
                <span className="px-4 text-white/30 font-motive text-[12px] uppercase tracking-widest font-medium">Or</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.05] via-white/[0.05] to-transparent" />
              </div>

              <div className="w-full pb-8">
                <h3 className="text-[16px] text-white/90 font-gate font-medium mb-4">Build Manually</h3>
                <button
                  onClick={() => {
                    if (session?.user?.type === 'guest') {
                      toast.error('Sign in to build custom automations!')
                      router.push('/register')
                      setCreateDrawerOpen(false)
                      return
                    }
                    setCreateDrawerOpen(false)
                    router.push('/workflows/new')
                  }}
                  className="group flex items-center justify-between w-full p-5 rounded-[20px] border border-[rgba(0,111,191,0.3)] bg-[#03060C] hover:border-[rgba(0,111,191,0.6)] transition-all"
                  style={{ 
                    boxShadow: '0 0 15px rgba(0, 111, 191, 0.1), inset 0 0 10px rgba(0, 111, 191, 0.1)'
                  }}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-white text-[15px] font-medium font-gate mb-1">Start from scratch</span>
                    <span className="text-white/40 text-[13px] font-motive">Drag and drop nodes on the canvas</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#060A16] border border-[rgba(255,255,255,0.05)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ChevronRight size={18} className="text-[#A8CEE5]" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-24 flex flex-col items-center gap-6 justify-center h-full">
              <div className="w-14 h-14 border-4 border-[rgba(0,111,191,0.2)] border-t-[rgba(0,111,191,1)] rounded-full animate-spin shadow-[0_0_20px_rgba(0,111,191,0.5)]" />
              <p className="text-[rgba(255,255,255,0.6)] text-[15px] font-motive animate-pulse tracking-wide">Designing your automation...</p>
            </div>
          )}

          {step === 3 && previewData && (
             <div className="w-full text-left animate-in slide-in-from-bottom-5 duration-500 flex flex-col gap-8">
                <div>
                  <h3 className="text-[24px] text-white font-gate font-bold mb-3 tracking-wide">{previewData.name || 'Your Automation is Ready!'}</h3>
                  <p className="text-[rgba(255,255,255,0.5)] text-[15px] leading-relaxed font-motive">{previewData.trigger_description || 'Click Save to start customizing your flow on the canvas.'}</p>
                </div>
                <div className="flex flex-col gap-4">
                   <button onClick={handleSave} className="w-full h-[48px] rounded-full text-white font-gate text-[14px] font-bold border border-[rgba(0,111,191,0.9)] transition-all hover:brightness-110 bg-[#03060C]" style={{ boxShadow: '0 0 20px rgba(0, 111, 191, 0.4), inset 0 0 15px rgba(0, 111, 191, 0.4)' }}>
                     Save Workflow
                   </button>
                   <button onClick={() => setStep(1)} className="w-full h-[48px] rounded-full bg-[#060A16] border border-[rgba(255,255,255,0.06)] text-white font-gate text-[14px] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                     Start Over
                   </button>
                </div>
             </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
