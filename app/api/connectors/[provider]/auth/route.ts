import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'

import { OAUTH_PROVIDERS } from '@/lib/connectors/providers'


// GET /api/connectors/[provider]/auth — redirects user to OAuth consent page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let { provider } = await params

  // Map sub-tools back to their master OAuth provider config
  const originalProvider = provider
  if (['google-calendar', 'google-sheets', 'google-drive', 'google-analytics'].includes(provider)) {
    provider = 'google'
  } else if (provider === 'microsoft-teams') {
    provider = 'microsoft-365'
  }

  const config = OAUTH_PROVIDERS[provider]

  if (!config) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}. Supported: ${Object.keys(OAUTH_PROVIDERS).join(', ')}` },
      { status: 400 }
    )
  }

  const clientId = process.env[config.clientIdEnv]
  if (!clientId) {
    return NextResponse.json(
      { error: `OAuth not configured for ${config.name}. Set ${config.clientIdEnv} in .env.local` },
      { status: 500 }
    )
  }

  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectUri = `${baseUrl}/api/connectors/${provider}/callback`

  // Build state with user ID for the callback
  const state = Buffer.from(JSON.stringify({
    userId: session.user.id,
    provider,
    timestamp: Date.now(),
  })).toString('base64url')

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    ...(config.scopes.length > 0 ? { scope: config.scopes.join(' ') } : {}),
    ...(config.extraAuthParams || {}),
  })


  const authUrl = `${config.authUrl}?${authParams.toString()}`

  return NextResponse.redirect(authUrl)
}
