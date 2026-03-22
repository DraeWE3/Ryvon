import { NextRequest, NextResponse } from 'next/server'
import { upsertConnectorAuth } from '@/lib/db/queries'

// OAuth provider token endpoints
const TOKEN_URLS: Record<string, string> = {
  google: 'https://oauth2.googleapis.com/token',
  slack: 'https://slack.com/api/oauth.v2.access',
}

const USER_INFO_URLS: Record<string, string> = {
  google: 'https://www.googleapis.com/oauth2/v2/userinfo',
  slack: 'https://slack.com/api/auth.test',
}

const CLIENT_ENV_MAP: Record<string, { id: string; secret: string }> = {
  google: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET' },
  slack: { id: 'SLACK_CLIENT_ID', secret: 'SLACK_CLIENT_SECRET' },
}

// GET /api/connectors/[provider]/callback — handles OAuth redirect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/workflows/connectors?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL('/workflows/connectors?error=missing_code', request.url)
    )
  }

  // Decode state
  let state: { userId: string; provider: string; timestamp: number }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(
      new URL('/workflows/connectors?error=invalid_state', request.url)
    )
  }

  const envKeys = CLIENT_ENV_MAP[provider]
  if (!envKeys) {
    return NextResponse.redirect(
      new URL(`/workflows/connectors?error=unknown_provider`, request.url)
    )
  }

  const clientId = process.env[envKeys.id]
  const clientSecret = process.env[envKeys.secret]

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/workflows/connectors?error=not_configured', request.url)
    )
  }

  const tokenUrl = TOKEN_URLS[provider]
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectUri = `${baseUrl}/api/connectors/${provider}/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL(`/workflows/connectors?error=token_exchange_failed`, request.url)
      )
    }

    // Get user info for display
    let accountEmail = ''
    let accountName = ''

    const userInfoUrl = USER_INFO_URLS[provider]
    if (userInfoUrl) {
      try {
        const accessToken = tokenData.access_token || tokenData.authed_user?.access_token
        if (accessToken) {
          if (provider === 'google') {
            const infoRes = await fetch(userInfoUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            const info = await infoRes.json()
            accountEmail = info.email || ''
            accountName = info.name || ''
          } else if (provider === 'slack') {
            const infoRes = await fetch(`${userInfoUrl}?token=${accessToken}`)
            const info = await infoRes.json()
            accountName = info.user || info.team || ''
          }
        }
      } catch {
        // Non-critical — just log
        console.warn('Failed to fetch user info for', provider)
      }
    }

    // Compute expiry
    let expiresAt: Date | undefined
    if (tokenData.expires_in) {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    }

    // Save to DB
    await upsertConnectorAuth({
      userId: state.userId,
      provider,
      accessToken: tokenData.access_token || tokenData.authed_user?.access_token || '',
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
      expiresAt,
      accountEmail,
      accountName,
      metadata: {
        team: tokenData.team?.name,
        teamId: tokenData.team?.id,
      },
    })

    return NextResponse.redirect(
      new URL(`/workflows/connectors?connected=${provider}`, request.url)
    )
  } catch (err: any) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/workflows/connectors?error=${encodeURIComponent(err.message)}`, request.url)
    )
  }
}
