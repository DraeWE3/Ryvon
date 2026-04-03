'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { useWorkflowUIStore, useCreateWorkflow } from '../hooks/useCreateWorkflow'
import { StepTimeline } from '../components/StepTimeline'

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export function CreateWorkflowDrawer({ onWorkflowCreated }: { onWorkflowCreated?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const { isCreateDrawerOpen, setCreateDrawerOpen, selectedTemplate, setSelectedTemplate } = useWorkflowUIStore()
  const { mutate: generateWorkflow, isPending } = useCreateWorkflow()
  const queryClient = useQueryClient()
  const [isCreatingManual, setIsCreatingManual] = useState(false)

  const [activeTab, setActiveTab] = useState<'describe' | 'templates'>('describe')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [input, setInput] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const res = await fetch('/api/workflows/templates')
      if (!res.ok) throw new Error('Failed to load templates')
      return res.json()
    },
    enabled: isCreateDrawerOpen,
  })

  useEffect(() => {
    if (isCreateDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setTimeout(() => {
        setStep(1)
        setInput('')
        setPreviewData(null)
        setErrorMsg('')
        setActiveTab('describe')
      }, 300)
    }
    return () => { document.body.style.overflow = '' }
  }, [isCreateDrawerOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateDrawerOpen && step !== 2) {
        setCreateDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateDrawerOpen, setCreateDrawerOpen, step])

  const handleUseTemplate = (template: any) => {
    // Use the template description as the AI input to generate a saved workflow
    setActiveTab('describe')
    setInput(template.description)
    setPreviewData({
      name: template.name,
      trigger_type: template.trigger_type,
      trigger_value: template.trigger_value,
      trigger_description: template.trigger_description,
      steps: template.steps,
    })
    setStep(3)
  }

  useEffect(() => {
    if (selectedTemplate) {
      setCreateDrawerOpen(true)
      handleUseTemplate(selectedTemplate)
      setSelectedTemplate(null)
    }
  }, [selectedTemplate, setCreateDrawerOpen, setSelectedTemplate])

  if (!isCreateDrawerOpen) return null

  const handleGenerate = () => {
    if (!input.trim()) return
    setStep(2)
    setErrorMsg('')
    generateWorkflow(input, {
      onSuccess: (data) => {
        setPreviewData(data)
        setStep(3)
      },
      onError: (err: Error) => {
        setErrorMsg(err.message || 'Failed to generate workflow')
        setStep(1)
      }
    })
  }

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] })
    toast.success('Workflow saved')
    setCreateDrawerOpen(false)
  }

  const exampleChips = [
    "Daily email summary to Slack",
    "Follow up with new HubSpot leads",
    "Weekly report every Monday 9am"
  ]

  const categoryColors: Record<string, string> = {
    Sales: '#f59e0b',
    Productivity: '#3b82f6',
    Marketing: '#ec4899',
    'Customer Success': '#10b981',
    Support: '#8b5cf6',
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[rgba(0,0,0,0.60)] transition-opacity"
        onClick={() => step !== 2 && setCreateDrawerOpen(false)}
      />

      {/* Drawer Panel */}
      <div 
        className="relative z-[201] w-[560px] max-w-full h-full bg-[#000] border-l border-[rgba(255,255,255,0.10)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.10)]">
          <h2 className="font-gate text-[16px] text-[#ffffff] m-0">New Workflow</h2>
          <button 
            onClick={() => step !== 2 && setCreateDrawerOpen(false)}
            className="text-[rgba(255,255,255,0.50)] hover:text-[#ffffff] transition-colors p-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {step === 1 && (
            <div className="flex flex-col animate-in fade-in duration-300 h-full">

              {/* Tabs */}
              <div className="flex p-1 bg-[rgba(255,255,255,0.05)] rounded-[10px] mb-6">
                <button
                  onClick={() => setActiveTab('describe')}
                  className={`flex-1 font-motive text-[13px] py-[6px] rounded-[6px] transition-all ${
                    activeTab === 'describe'
                      ? 'bg-[rgba(255,255,255,0.15)] text-[#ffffff]'
                      : 'text-[rgba(255,255,255,0.50)] hover:text-[#ffffff]'
                  }`}
                >
                  Prompt
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`flex-1 font-motive text-[13px] py-[6px] rounded-[6px] transition-all ${
                    activeTab === 'templates'
                      ? 'bg-[rgba(255,255,255,0.15)] text-[#ffffff]'
                      : 'text-[rgba(255,255,255,0.50)] hover:text-[#ffffff]'
                  }`}
                >
                  Templates ✨
                </button>
              </div>

              {activeTab === 'describe' ? (
                <>
                  <label className="font-motive text-[13px] text-[#ffffff] mb-2 block">
                    Describe your workflow
                  </label>
                  <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Every morning at 8am, summarize my emails and post a Slack briefing"
                className="font-motive text-[13px] text-[#ffffff] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] focus:border-[#3071e1] outline-none rounded-[8px] p-[12px] min-h-[120px] resize-y placeholder-[rgba(255,255,255,0.30)] transition-colors"
                autoFocus
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {exampleChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(chip)}
                    className="font-motive text-[11px] text-[rgba(255,255,255,0.50)] border border-[rgba(255,255,255,0.12)] rounded-[20px] px-[12px] py-[4px] hover:border-[rgba(255,255,255,0.30)] hover:text-[#ffffff] cursor-pointer transition-colors bg-transparent text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="mt-4 font-motive text-[12px] text-[rgba(255,100,100,0.90)]">
                  {errorMsg}
                </div>
              )}

              <button
                disabled={!input.trim()}
                onClick={handleGenerate}
                className="w-full text-[#ffffff] font-gate font-bold text-[13px] rounded-full py-[10px] px-6 mt-6 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:brightness-110"
                style={{
                  background: 'linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)',
                  boxShadow: '0 4px 15px rgba(0, 125, 192, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                }}
              >
                Generate Workflow ✨
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
                <span className="font-motive text-[11px] text-[rgba(255,255,255,0.25)] uppercase">or</span>
                <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
              </div>

                {/* Create Manually Button */}
                <button
                  onClick={() => {
                    setCreateDrawerOpen(false)
                    router.push('/workflows/new')
                  }}
                  className="w-full border border-[rgba(255,255,255,0.10)] hover:border-[#0062FF] text-[rgba(255,255,255,0.60)] hover:text-white font-motive text-[13px] rounded-full py-[10px] px-6 mt-3 flex items-center justify-center gap-2 transition-all bg-transparent cursor-pointer"
                >
                  🛠️ Create Manually
                </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-8 h-full">
                  {!templates ? (
                    <div className="text-[rgba(255,255,255,0.5)] font-motive text-[13px] text-center pt-8">Loading templates...</div>
                  ) : templates.map((t: any) => (
                    <div 
                      key={t.id} 
                      className="group bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[#3071e1] hover:bg-[rgba(48,113,225,0.05)] rounded-[12px] p-4 cursor-pointer transition-all flex border-l-[3px] hover:border-l-[#3071e1]"
                      style={{ borderLeftColor: categoryColors[t.category] || '#3071e1' }}
                      onClick={() => handleUseTemplate(t)}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-gate text-[14px] text-[#ffffff] leading-tight mb-1">{t.name}</h3>
                          <span className="font-motive text-[10px] text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full">{t.category}</span>
                        </div>
                        <p className="font-motive text-[12px] text-[rgba(255,255,255,0.6)] leading-relaxed mb-3">{t.description}</p>
                        
                        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[rgba(255,255,255,0.05)] overflow-x-hidden">
                          {t.steps.map((s: any, i: number) => (
                            <React.Fragment key={s.id}>
                              <div className="flex-shrink-0 font-motive text-[10px] text-[#ffffff] bg-[#1a1a1a] border border-[#333] rounded-[4px] px-[8px] py-[3px]">
                                {s.agent}
                              </div>
                              {i < t.steps.length - 1 && (
                                <span className="text-[rgba(255,255,255,0.2)] text-[10px]">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center flex-1 animate-in fade-in duration-300 min-h-[200px]">
              <div className="font-motive text-[13px] text-[rgba(255,255,255,0.50)] flex items-center gap-1">
                Generating your workflow
                <span className="inline-flex w-[12px] ml-1">
                  <span className="animate-[bounce_1s_infinite_0ms]">.</span>
                  <span className="animate-[bounce_1s_infinite_200ms]">.</span>
                  <span className="animate-[bounce_1s_infinite_400ms]">.</span>
                </span>
              </div>
            </div>
          )}

          {step === 3 && previewData && (
            <div className="flex flex-col animate-in slide-in-from-right-4 duration-300">
              <h3 className="font-gate text-[15px] text-[#ffffff] font-medium mb-4">
                {previewData.name || 'Generated Workflow'}
              </h3>

              <div className="flex items-center gap-3 mb-6">
                <span className="font-motive text-[12px] text-[rgba(255,255,255,0.45)]">Trigger</span>
                <span className="font-motive text-[11px] text-[#8cdff4] border border-[#8cdff4] bg-transparent rounded-[20px] px-[10px] py-[2px] uppercase">
                  {previewData.trigger_type || previewData.triggerType || 'EVENT'}
                </span>
                <span className="font-mono text-[13px] text-[#8cdff4] truncate">
                  {previewData.trigger_value || previewData.triggerValue || 'manual'}
                </span>
              </div>

              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-4 mb-6">
                <StepTimeline steps={previewData.steps || []} compact={true} />
              </div>

              <div className="mt-auto pt-6 flex flex-col gap-2">
                <button
                  onClick={handleSave}
                  className="w-full text-[#ffffff] font-gate font-bold text-[13px] rounded-[8px] h-[40px] flex items-center justify-center transition-all active:scale-[0.98] hover:brightness-110"
                  style={{
                    background: 'linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)',
                    boxShadow: '0 4px 15px rgba(0, 125, 192, 0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                  }}
                >
                  Save Workflow
                </button>
                <button
                  onClick={() => {
                    setStep(1)
                    setPreviewData(null)
                  }}
                  className="w-full bg-transparent text-[rgba(255,255,255,0.40)] hover:text-[#ffffff] font-motive text-[12px] h-[32px] flex items-center justify-center transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
