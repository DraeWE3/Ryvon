import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'

// OAuth provider configurations
// Add your real client IDs, secrets, and scopes to .env.local
const OAUTH_PROVIDERS: Record<string, {
  authUrl: string
  tokenUrl: string
  clientIdEnv: string
  clientSecretEnv: string
  scopes: string[]
  name: string
}> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    name: 'Google',
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    scopes: [
      'channels:read',
      'chat:write',
      'users:read',
    ],
    name: 'Slack',
  },
}

// GET /api/connectors/[provider]/auth — redirects user to OAuth consent page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider } = await params
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
      { error: `OAuth not configured. Set ${config.clientIdEnv} in your .env.local` },
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
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `${config.authUrl}?${authParams.toString()}`

  return NextResponse.redirect(authUrl)
}
