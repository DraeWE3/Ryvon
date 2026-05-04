'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, Search } from 'lucide-react'
import { AuthNotificationModal, type AuthNotificationType } from '@/components/auth-notification-modal'

// Map connector ID -> Simple Icons slug (see https://simpleicons.org)
const ICON_SLUGS: Record<string, string> = {
  google: 'gmail',
  slack: 'slack',
  'microsoft-teams': 'microsoftteams',
  discord: 'discord',
  twilio: 'twilio',
  whatsapp: 'whatsapp',
  sendgrid: 'sendgrid',
  'google-calendar': 'googlecalendar',
  'google-sheets': 'googlesheets',
  notion: 'notion',
  airtable: 'airtable',
  trello: 'trello',
  asana: 'asana',
  jira: 'jira',
  'google-drive': 'googledrive',
  dropbox: 'dropbox',
  'microsoft-365': 'microsoft365',
  hubspot: 'hubspot',
  salesforce: 'salesforce',
  pipedrive: 'pipedrive',
  'zoho-crm': 'zoho',
  stripe: 'stripe',
  paypal: 'paypal',
  zendesk: 'zendesk',
  intercom: 'intercom',
  freshdesk: 'freshdesk',
  crisp: 'crisp',
  mailchimp: 'mailchimp',
  twitter: 'x',
  linkedin: 'linkedin',
  meta: 'meta',
  wordpress: 'wordpress',
  webflow: 'webflow',
  'google-analytics': 'googleanalytics',
  http: 'curl',
  github: 'github',
  gitlab: 'gitlab',
  aws: 'amazonaws',
  supabase: 'supabase',
  firebase: 'firebase',
  postgresql: 'postgresql',
  ai: 'openai',
  openai: 'openai',
  elevenlabs: 'elevenlabs',
  replicate: 'replicate',
  shopify: 'shopify',
  woocommerce: 'woocommerce',
  gumroad: 'gumroad',
}

function ConnectorIcon({ id, name }: { id: string; name: string }) {
  const slug = ICON_SLUGS[id]
  const [errored, setErrored] = React.useState(false)

  if (!slug || errored) {
    // Fallback: coloured initials badge
    return (
      <div className="w-9 h-9 rounded-[8px] bg-[rgba(140,223,244,0.12)] border border-[rgba(140,223,244,0.15)] flex items-center justify-center flex-shrink-0">
        <span className="font-motive text-[12px] font-semibold text-[#8cdff4] uppercase leading-none">
          {name.slice(0, 2)}
        </span>
      </div>
    )
  }

  return (
    <div className="w-9 h-9 rounded-[8px] bg-white flex items-center justify-center flex-shrink-0 p-[7px] shadow-sm">
      <img
        src={`https://cdn.simpleicons.org/${slug}`}
        alt={name}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  )
}

interface Connector {
  id: string
  name: string
  icon: string
  description: string
  category: string
  actions: string[]
  oauthSupported: boolean
  connected: boolean
  accountEmail: string | null
  accountName: string | null
  connectedAt: string | null
  apiUrl: string | null
}

import { SidebarToggle } from '@/components/sidebar-toggle'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { staggerReveal, containerSequence } from '@/lib/animations/timelines'
import { MOTION } from '@/lib/animations/motion'

function ConnectorCardItem({ 
  connector, 
  handleConnect, 
  setAddingKeyFor, 
  handleDisconnect, 
  categoryColors,
  isDisconnecting
}: { 
  connector: Connector, 
  handleConnect: (id: string) => void, 
  setAddingKeyFor: (c: Connector) => void, 
  handleDisconnect: (id: string) => void, 
  categoryColors: Record<string, string>,
  isDisconnecting: boolean
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const iconRef = React.useRef<HTMLDivElement>(null)
  
  const { contextSafe } = useGSAP({ scope: cardRef })

  const handleMouseEnter = contextSafe(() => {
    const tl = gsap.timeline()
    tl.to(cardRef.current, {
      scale: 1.02,
      borderColor: "rgba(255,255,255,0.15)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      duration: MOTION.fast,
      ease: "ryvon-snappy"
    }, 0)
    .to(iconRef.current, {
      scale: 1.1,
      rotate: 4,
      duration: MOTION.fast,
      ease: "power2.out"
    }, 0)
  })

  const handleMouseLeave = contextSafe(() => {
    const tl = gsap.timeline()
    tl.to(cardRef.current, {
      scale: 1,
      borderColor: "rgba(255,255,255,0.08)",
      boxShadow: "none",
      duration: MOTION.base,
      ease: "ryvon-soft"
    }, 0)
    .to(iconRef.current, {
      scale: 1,
      rotate: 0,
      duration: MOTION.base,
      ease: "power2.out"
    }, 0)
  })

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="connector-card-item border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 flex flex-col min-h-[180px] overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 60, 115, 0.4) 0%, rgba(8, 20, 45, 0.8) 45%, rgba(4, 9, 20, 1) 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div ref={iconRef} className="origin-center">
            <ConnectorIcon id={connector.id} name={connector.name} />
          </div>
          <div>
            <h3 className="font-gate text-[15px] text-[#ffffff] font-medium m-0">
              {connector.name}
            </h3>
            <span
              className="font-motive text-[10px] uppercase font-bold tracking-wider"
              style={{ color: categoryColors[connector.category] || '#A8CEE5' }}
            >
              {connector.category}
            </span>
          </div>
        </div>
        {/* Status dot */}
        <span
          className={`w-[8px] h-[8px] rounded-full shadow-sm ${
            connector.connected ? 'bg-[#10b981] shadow-[#10b981]/50' : 'bg-[rgba(255,255,255,0.15)] bg-opacity-30'
          }`}
        />
      </div>

      {/* Description */}
      <p className="font-motive text-[13px] text-[rgba(255,255,255,0.40)] m-0 mb-3 flex-1 relative z-10 line-clamp-2">
        {connector.description}
      </p>

      {/* Connection info */}
      {connector.connected && (connector.accountEmail || connector.accountName) && (
        <div className="mb-4 py-2 px-3 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-[6px] relative z-10">
          <span className="font-motive text-[11px] text-[#10b981] truncate block">
            Connected{connector.accountEmail ? ` as ${connector.accountEmail}` : connector.accountName ? ` as ${connector.accountName}` : ''}
          </span>
          {connector.connectedAt && (
            <span className="font-motive text-[10px] text-[rgba(255,255,255,0.30)] block mt-[2px]">
              {(() => {
                const d = new Date(connector.connectedAt)
                return isNaN(d.getTime()) ? '' : `Since ${format(d, 'MMM d, yyyy')}`
              })()}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap mt-auto relative z-10">
        {/* OAuth Connect */}
        {connector.oauthSupported && !connector.connected && (
          <button
            onClick={() => handleConnect(connector.id)}
            className="cursor-pointer font-gate font-bold text-[11px] text-[#ffffff] rounded-full py-[6px] px-4 transition-all text-center active:scale-95 border-none outline-none hover:shadow-[0_0_15px_rgba(140,223,244,0.3)] hover:brightness-110"
            style={{
              background: 'linear-gradient(180deg, rgba(168,206,229,0.9) 0%, rgba(0,125,192,0.9) 50%, rgba(0,28,60,0.95) 100%)',
              boxShadow: '0 4px 15px rgba(0, 125, 192, 0.3), inset 0 1px 1px rgba(255,255,255,0.3)',
            }}
          >
            Connect
          </button>
        )}

        {/* Manual Add Key */}
        {!connector.oauthSupported && !connector.connected && connector.id !== 'http' && connector.id !== 'ai' && (
          <button
            onClick={() => setAddingKeyFor(connector)}
            className="cursor-pointer font-gate font-bold text-[11px] text-[#ffffff] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] hover:border-white/20 rounded-full py-[6px] px-4 transition-colors text-center active:scale-[0.97]"
          >
            Add API Key
          </button>
        )}

        {/* Disconnect Buttons */}
        {connector.connected && connector.id !== 'http' && connector.id !== 'ai' && (
          <button
            onClick={() => handleDisconnect(connector.id)}
            disabled={isDisconnecting}
            className="cursor-pointer font-gate font-bold text-[11px] text-[rgba(255,100,100,0.70)] hover:text-[rgba(255,100,100,1)] bg-[rgba(255,100,100,0.05)] border border-[rgba(255,100,100,0.15)] hover:border-[rgba(255,100,100,0.30)] rounded-full py-[6px] px-4 transition-colors text-center active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        )}

        {/* Built-ins */}
        {connector.connected && (connector.id === 'http' || connector.id === 'ai') && (
          <span className="font-gate font-bold text-[11px] text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] rounded-full py-[4px] px-3">
            ✓ Built-in
          </span>
        )}

        {/* API Link */}
        {connector.apiUrl && !connector.connected && (
          <a
            href={connector.apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto font-motive font-medium text-[11px] text-[rgba(255,255,255,0.35)] hover:text-[#8cdff4] transition-colors flex items-center gap-1 shrink-0 px-2"
          >
            Get Key →
          </a>
        )}
      </div>
    </div>
  )
}

function ConnectorsContent() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: async () => {
      const res = await fetch('/api/connectors')
      if (!res.ok) throw new Error('Failed to load connectors')
      return res.json()
    },
  })

  // Handle OAuth callback URL params (?connected=provider or ?error=...)
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      setNotifModal({
        isOpen: true,
        type: 'success',
        title: 'Connected!',
        message: `${connected.charAt(0).toUpperCase() + connected.slice(1)} has been connected successfully.`,
      })
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      router.replace('/workflows/connectors')
    } else if (error) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Connection Failed',
        message: `Could not connect: ${decodeURIComponent(error)}`,
      })
      router.replace('/workflows/connectors')
    }
  }, [searchParams, queryClient, router])
  
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [addingKeyFor, setAddingKeyFor] = useState<Connector | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [accountNameInput, setAccountNameInput] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  // Notification Modal State
  const [notifModal, setNotifModal] = useState<{
    isOpen: boolean;
    type: AuthNotificationType;
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  const handleConnect = (providerId: string) => {
    // Navigate in the SAME tab so the user returns here naturally
    window.location.href = `/api/connectors/${providerId}/auth`
  }

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addingKeyFor || !apiKeyInput) return

    setIsSavingKey(true)
    try {
      const res = await fetch('/api/connectors/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: addingKeyFor.id,
          apiKey: apiKeyInput,
          accountName: accountNameInput || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save API Key')
      
      setNotifModal({
        isOpen: true,
        type: 'success',
        title: 'Connected!',
        message: `${addingKeyFor.name} has been connected successfully.`,
      })
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      setAddingKeyFor(null)
      setApiKeyInput('')
      setAccountNameInput('')
    } catch (err) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Failed',
        message: 'Could not save API Key. Please try again.',
      })
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    setDisconnectingId(providerId)
    try {
      const res = await fetch(`/api/connectors/${providerId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      setNotifModal({
        isOpen: true,
        type: 'success',
        title: 'Disconnected',
        message: 'Connector has been disconnected successfully.',
      })
    } catch {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Failed',
        message: 'Could not disconnect connector. Please try again.',
      })
    } finally {
      setDisconnectingId(null)
    }
  }

  const categoryColors: Record<string, string> = {
    Communication: '#8b5cf6',
    Productivity: '#3b82f6',
    'Sales & CRM': '#f59e0b',
    Support: '#ec4899',
    Marketing: '#10b981',
    Developer: '#6b7280',
    AI: '#8cdff4',
    'E-commerce': '#f97316',
  }

  const containerRef = React.useRef<HTMLDivElement>(null)


  return (
    <div ref={containerRef} className="flex h-full flex-col bg-transparent p-8 overflow-y-auto workflow-bg relative">
      <div className="header-seq">
      <div className="flex items-center gap-4 mb-6">
        <SidebarToggle className="p-0 mr-0" />
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 font-motive text-[13px] text-[rgba(255,255,255,0.40)]">
          <Link href="/workflows" className="hover:text-white transition-colors">Workflows</Link>
          <span>/</span>
          <span className="text-white">Connectors</span>
        </div>
      </div>
 
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="font-gate text-[24px] text-[#ffffff] font-medium leading-tight mb-2 m-0">
            Connectors
          </h1>
          <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] m-0">
            Connect your tools to use them dynamically inside your workflows.
          </p>
        </div>
 
        {/* Search Bar */}
        <div className="relative group/search w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-white/30 group-focus-within/search:text-[#8cdff4] transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connectors..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-full py-2.5 pl-11 pr-4 font-motive text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#8cdff4]/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(140,223,244,0.1)] transition-all"
          />
        </div>
      </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 h-[180px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {connectors
            ?.filter(c => 
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.category.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((connector) => (
              <ConnectorCardItem 
                 key={connector.id} 
                 connector={connector} 
                 handleConnect={handleConnect} 
                 setAddingKeyFor={setAddingKeyFor} 
                 handleDisconnect={handleDisconnect} 
                 categoryColors={categoryColors} 
                 isDisconnecting={disconnectingId === connector.id}
              />
            ))}
          {connectors && searchQuery && connectors.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
              <Search className="w-12 h-12 mb-4 text-white/10" />
              <p className="font-motive text-sm text-white/40">No connectors found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Manual API Key Modal */}
      {addingKeyFor && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-[16px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col scale-95 opacity-0 animate-[modalEnter_0.3s_cubic-bezier(0.22,1,0.36,1)_forwards]">
            <style>{`
              @keyframes modalEnter {
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#8cdff4] to-transparent opacity-50" />
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <ConnectorIcon id={addingKeyFor.id} name={addingKeyFor.name} />
                <h2 className="font-gate text-[18px] text-white">Connect {addingKeyFor.name}</h2>
              </div>
              <button
                onClick={() => setAddingKeyFor(null)}
                className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveApiKey} className="p-6 flex flex-col gap-5">
              <p className="font-motive text-[13px] text-[rgba(255,255,255,0.6)] leading-relaxed m-0">
                To connect Ryvon to your <strong>{addingKeyFor.name}</strong> account, paste your API Key below. This key will be encrypted and stored securely.
              </p>

              <div className="flex flex-col gap-2">
                <label className="font-motive text-[11px] text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                  API Key / Token *
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your secret key..."
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-4 py-3 font-mono text-[13px] text-white placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#8cdff4] focus:ring-1 focus:ring-[#8cdff4] transition-all"
                  required
                  autoFocus
                />
                {addingKeyFor.apiUrl && (
                  <a
                    href={addingKeyFor.apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-motive text-[11px] text-[#8cdff4] hover:underline"
                  >
                    Where do I find this?
                  </a>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-motive text-[11px] text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                  Connection Name (Optional)
                </label>
                <input
                  type="text"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder="e.g. My Personal Account"
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-4 py-3 font-motive text-[13px] text-white placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#8cdff4] focus:ring-1 focus:ring-[#8cdff4] transition-all"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setAddingKeyFor(null)}
                  className="font-motive text-[13px] text-[rgba(255,255,255,0.7)] hover:text-white px-4 py-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!apiKeyInput || isSavingKey}
                  className="font-motive text-[13px] text-[#000000] bg-[#8cdff4] hover:bg-white rounded-[8px] px-6 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSavingKey ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AuthNotificationModal
        isOpen={notifModal.isOpen}
        onClose={() => setNotifModal(prev => ({ ...prev, isOpen: false }))}
        type={notifModal.type}
        title={notifModal.title}
        message={notifModal.message}
      />
    </div>
  )
}

import { Suspense } from 'react'

export default function ConnectorsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full flex-col bg-transparent p-8 overflow-y-auto workflow-bg relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-pulse">
          <div className="h-20 w-64 bg-white/5 rounded-lg" />
          <div className="h-10 w-48 bg-white/5 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 h-[180px] animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ConnectorsContent />
    </Suspense>
  )
}

