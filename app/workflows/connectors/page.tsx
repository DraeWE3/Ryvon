'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

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
}

import { WorkflowToggle } from '@/features/workflows/components/WorkflowToggle'

export default function ConnectorsPage() {
  const queryClient = useQueryClient()

  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: async () => {
      const res = await fetch('/api/connectors')
      if (!res.ok) throw new Error('Failed to load connectors')
      return res.json()
    },
  })

  const handleConnect = (providerId: string) => {
    // Redirect to OAuth flow
    window.location.href = `/api/connectors/${providerId}/auth`
  }

  const handleDisconnect = async (providerId: string) => {
    try {
      const res = await fetch(`/api/connectors/${providerId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      toast.success('Connector disconnected')
    } catch {
      toast.error('Failed to disconnect connector')
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

  return (
    <div className="flex h-full flex-col bg-transparent p-8 overflow-y-auto workflow-bg">
      <div className="flex items-center gap-4 mb-6">
        <WorkflowToggle className="p-0 mr-0" />
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 font-motive text-[13px] text-[rgba(255,255,255,0.40)]">
          <Link href="/workflows" className="hover:text-white transition-colors">Workflows</Link>
          <span>/</span>
          <span className="text-white">Connectors</span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-gate text-[24px] text-[#ffffff] font-medium leading-tight mb-2 m-0">
            Connectors
          </h1>
          <p className="font-motive text-[14px] text-[rgba(255,255,255,0.45)] m-0">
            Connect your tools to use them in workflow steps.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 h-[180px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors?.map((connector) => (
            <div
              key={connector.id}
              className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 flex flex-col hover:border-[rgba(255,255,255,0.15)] transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[24px]">{connector.icon}</span>
                  <div>
                    <h3 className="font-gate text-[15px] text-[#ffffff] font-medium m-0">
                      {connector.name}
                    </h3>
                    <span
                      className="font-motive text-[10px] uppercase"
                      style={{ color: categoryColors[connector.category] || '#888' }}
                    >
                      {connector.category}
                    </span>
                  </div>
                </div>
                {/* Status dot */}
                <span
                  className={`w-[8px] h-[8px] rounded-full ${
                    connector.connected ? 'bg-[#10b981]' : 'bg-[rgba(255,255,255,0.15)]'
                  }`}
                />
              </div>

              {/* Description */}
              <p className="font-motive text-[12px] text-[rgba(255,255,255,0.40)] m-0 mb-3 flex-1">
                {connector.description}
              </p>

              {/* Connection info */}
              {connector.connected && (connector.accountEmail || connector.accountName) && (
                <div className="mb-3 py-2 px-3 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-[6px]">
                  <span className="font-motive text-[11px] text-[#10b981]">
                    Connected{connector.accountEmail ? ` as ${connector.accountEmail}` : connector.accountName ? ` as ${connector.accountName}` : ''}
                  </span>
                  {connector.connectedAt && (
                    <span className="font-motive text-[10px] text-[rgba(255,255,255,0.20)] block mt-[2px]">
                      {(() => {
                        const d = new Date(connector.connectedAt)
                        return isNaN(d.getTime()) ? '' : `Since ${format(d, 'MMM d, yyyy')}`
                      })()}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {connector.oauthSupported && !connector.connected && (
                  <button
                    onClick={() => handleConnect(connector.id)}
                    className="font-motive text-[11px] text-[#ffffff] rounded-full py-[5px] px-4 transition-all text-center active:scale-95"
                    style={{
                      background: 'linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)',
                      boxShadow: '0 4px 15px rgba(0, 125, 192, 0.3)',
                    }}
                  >
                    Connect
                  </button>
                )}
                {connector.connected && connector.oauthSupported && (
                  <button
                    onClick={() => handleDisconnect(connector.id)}
                    className="flex-1 font-motive text-[12px] text-[rgba(255,100,100,0.70)] hover:text-[rgba(255,100,100,1)] border border-[rgba(255,100,100,0.15)] hover:border-[rgba(255,100,100,0.30)] rounded-[6px] py-[6px] px-3 transition-colors text-center"
                  >
                    Disconnect
                  </button>
                )}
                {connector.connected && !connector.oauthSupported && (
                  <span className="font-motive text-[11px] text-[#10b981]">
                    ✓ Built-in
                  </span>
                )}
                {!connector.connected && !connector.oauthSupported && (
                  <span className="font-motive text-[11px] text-[rgba(255,255,255,0.25)]">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
