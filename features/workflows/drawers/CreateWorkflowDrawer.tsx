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

  const drawerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

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
        className="animate-bg-shift relative z-[501] w-full max-w-[500px] h-full border-l border-[rgba(255,255,255,0.06)] shadow-[-20px_0_100px_rgba(0,111,191,0.15)] flex flex-col py-[40px] px-[40px] overflow-y-auto"
        style={{ 
          background: 'linear-gradient(160deg, #020409 0%, #061430 45%, #010204 100%)'
        }}
      >
        <div ref={contentRef} className="flex flex-col h-full w-full">
        {/* Header Navigation */}
        <div className="flex items-center justify-between w-full mb-[50px]">
          <button 
            onClick={() => setCreateDrawerOpen(false)}
            className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
            <span className="font-motive font-bold text-[14px]">Back</span>
          </button>
        </div>

        <div className="flex flex-col items-center flex-1">
          <h2 className="text-[26px] text-white font-gate font-bold tracking-wide mb-[50px] text-center">Create New Automation</h2>

          {step === 1 && (
            <div className="w-full">
              <div className="w-full text-left mb-12">
                <h3 className="text-[22px] text-white font-gate font-bold mb-6 pl-1 tracking-wide">Generate With AI</h3>
                <div className="relative group">
                   {/* Background for textarea container */}
                   <div className="absolute inset-0 bg-[#060A16] border border-[rgba(255,255,255,0.04)] rounded-[20px]" />
                   
                   <div className="absolute top-5 left-5 z-10">
                      <img src="/img-sidebar/side-logo.svg" alt="" className="w-5 h-5 opacity-90" />
                   </div>
                   
                   <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Describe your automation workflow... e.g., "Automatically generate and send a weekly email summary of lead activity from HubSpot to my team."'
                    className="relative z-10 w-full bg-transparent p-5 pl-[52px] pb-[40px] min-h-[160px] text-white text-[15px] font-motive leading-[1.6] resize-none focus:outline-none placeholder-[rgba(255,255,255,0.4)]"
                    autoFocus
                  />
                  
                  {/* Bottom Action Group */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 z-20 w-[90%]">
                    <button 
                       onClick={handleGenerate}
                       disabled={!input.trim() || isPending}
                       className="group/btn flex items-center justify-center gap-2 flex-1 h-[40px] rounded-full text-white font-gate text-[13px] font-bold border border-[rgba(0,111,191,0.6)] hover:border-[rgba(0,111,191,0.9)] disabled:opacity-50 transition-all bg-[#03060C]"
                       style={{ 
                         boxShadow: '0 0 15px rgba(0, 111, 191, 0.4), inset 0 0 10px rgba(0, 111, 191, 0.4)'
                       }}
                    >
                       Generate <Sparkles size={14} className="group-hover/btn:rotate-12 transition-transform" />
                    </button>
                    
                    <button className="flex flex-shrink-0 items-center justify-center w-[40px] h-[40px] rounded-full bg-[#03060C] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors">
                       <Mic size={16} />
                    </button>
                  </div>
                </div>

                {/* AI Prompt Suggestions */}
                <div className="mt-10 animate-in fade-in duration-500">
                  <p className="text-[12px] font-motive text-[rgba(255,255,255,0.3)] mb-3 uppercase tracking-wider">Try asking for:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Sync new HubSpot leads to Google Sheets",
                      "Post a Slack alert for every new Stripe charge",
                      "Draft and send a welcome email to new users",
                      "Create a Jira ticket from incoming support emails"
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[rgba(255,255,255,0.5)] font-motive text-[12px] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(0,111,191,0.4)] hover:text-[#A8CEE5] transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center w-full mb-10 mt-8">
                <span className="text-[rgba(255,255,255,0.4)] font-motive font-bold text-[18px]">OR</span>
              </div>

              <div className="w-full text-center pb-4">
                <h3 className="text-[22px] text-white font-gate font-bold mb-6 tracking-wide">Build Manually</h3>
                <button
                  onClick={() => {
                    setCreateDrawerOpen(false)
                    router.push('/workflows/new')
                  }}
                  className="inline-flex items-center justify-center w-full max-w-[260px] h-[44px] rounded-full text-white font-gate text-[14px] font-bold border border-[rgba(0,111,191,0.6)] hover:border-[rgba(0,111,191,0.9)] transition-all bg-[#03060C]"
                  style={{ 
                    boxShadow: '0 0 15px rgba(0, 111, 191, 0.3), inset 0 0 10px rgba(0, 111, 191, 0.3)'
                  }}
                >
                  Start from scratch
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-24 flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-[rgba(0,111,191,0.2)] border-t-[rgba(0,111,191,1)] rounded-full animate-spin shadow-[0_0_15px_rgba(0,111,191,0.5)]" />
              <p className="text-[rgba(255,255,255,0.6)] text-[15px] font-motive animate-pulse">Designing your automation...</p>
            </div>
          )}

          {step === 3 && previewData && (
             <div className="w-full text-left animate-in slide-in-from-bottom-5 duration-500">
                <h3 className="text-[22px] text-white font-gate font-bold mb-3 tracking-wide">{previewData.name || 'Your Automation is Ready!'}</h3>
                <p className="text-[rgba(255,255,255,0.5)] text-[15px] mb-10 leading-relaxed font-motive">{previewData.trigger_description || 'Click Save to start customizing your flow on the canvas.'}</p>
                <div className="flex flex-col gap-4">
                   <button onClick={handleSave} className="w-full h-[48px] rounded-full text-white font-gate text-[14px] font-bold border border-[rgba(0,111,191,0.9)] transition-all hover:brightness-110 bg-[#03060C]" style={{ boxShadow: '0 0 20px rgba(0, 111, 191, 0.4), inset 0 0 15px rgba(0, 111, 191, 0.4)' }}>Save Workflow</button>
                   <button onClick={() => setStep(1)} className="w-full h-[48px] rounded-full bg-[#060A16] border border-[rgba(255,255,255,0.06)] text-white font-gate text-[14px] hover:bg-[rgba(255,255,255,0.04)] transition-colors">Start Over</button>
                </div>
             </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
