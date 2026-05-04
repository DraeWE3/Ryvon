import { NextRequest, NextResponse } from 'next/server'
import { upsertConnectorAuth } from '@/lib/db/queries'
import { OAUTH_PROVIDERS } from '@/lib/connectors/providers'

// Bypass SSL verification in local development to fix fetch TLS errors
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// User info endpoints for each provider (to get display name/email)
const USER_INFO_FETCHERS: Record<string, (accessToken: string) => Promise<{ email: string; name: string }>> = {
  google: async (token) => {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.name || '' }
  },
  slack: async (token) => {
    const res = await fetch(`https://slack.com/api/auth.test?token=${token}`)
    const data = await res.json()
    return { email: '', name: data.user || data.team || '' }
  },
  notion: async (token) => {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
    })
    const data = await res.json()
    return { email: data.person?.email || '', name: data.name || '' }
  },
  hubspot: async (token) => {
    const res = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + token)
    const data = await res.json()
    return { email: data.user || '', name: data.hub_domain || '' }
  },

  github: async (token) => {
    const res = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Ryvon' } })
    const data = await res.json()
    return { email: data.email || '', name: data.login || data.name || '' }
  },
  discord: async (token) => {
    const res = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: `${data.username}#${data.discriminator}` }
  },
  linkedin: async (token) => {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.name || '' }
  },
  airtable: async (token) => {
    const res = await fetch('https://api.airtable.com/v0/meta/whoami', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.id || '' }
  },
  asana: async (token) => {
    const res = await fetch('https://app.asana.com/api/1.0/users/me', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.data?.email || '', name: data.data?.name || '' }
  },
  dropbox: async (token) => {
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return { email: data.email || '', name: data.name?.display_name || '' }
  },
  'microsoft-365': async (token) => {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.mail || data.userPrincipalName || '', name: data.displayName || '' }
  },
  meta: async (token) => {
    const res = await fetch(`https://graph.facebook.com/me?fields=name,email&access_token=${token}`)
    const data = await res.json()
    return { email: data.email || '', name: data.name || '' }
  },
  'zoho-crm': async (token) => {
    const res = await fetch('https://www.zohoapis.com/crm/v2/users?type=CurrentUser', { headers: { Authorization: `Zoho-oauthtoken ${token}` } })
    const data = await res.json()
    const user = data.users?.[0]
    return { email: user?.email || '', name: user?.full_name || '' }
  },
  jira: async (token) => {
    const res = await fetch('https://api.atlassian.com/me', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.name || data.nickname || '' }
  },
  gitlab: async (token) => {
    const res = await fetch('https://gitlab.com/api/v4/user', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.username || data.name || '' }
  },
  mailchimp: async (token) => {
    const metaRes = await fetch('https://login.mailchimp.com/oauth2/metadata', { headers: { Authorization: `OAuth ${token}` } })
    const meta = await metaRes.json()
    return { email: meta.login?.email || '', name: meta.accountname || '' }
  },
  stripe: async (token) => {
    return { email: '', name: 'Stripe Account' }
  },
  intercom: async (token) => {
    const res = await fetch('https://api.intercom.io/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const data = await res.json()
    return { email: data.email || '', name: data.name || '' }
  },
  webflow: async (token) => {
    const res = await fetch('https://api.webflow.com/v2/token/authorized_by', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.email || '', name: data.firstName || '' }
  },
  pipedrive: async (token) => {
    const res = await fetch('https://api.pipedrive.com/v1/users/me', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { email: data.data?.email || '', name: data.data?.name || '' }
  },
}

// Default user info fetcher (returns empty)
const defaultFetcher = async () => ({ email: '', name: '' })

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
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=${encodeURIComponent(error)}`)
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=missing_code`)
  }

  // Decode state
  let state: { userId: string; provider: string; timestamp: number }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=invalid_state`)
  }

  const config = OAUTH_PROVIDERS[provider]
  if (!config) {
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=unknown_provider`)
  }

  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=not_configured`)
  }

  // Sanitize base URL — must match exactly what was sent in the auth step
  const rawUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const baseUrl = rawUrl.replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/connectors/${provider}/callback`

  try {
    // Exchange code for tokens
    // Notion uses Basic Auth instead of body params
    const isNotion = provider === 'notion'
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    if (isNotion) {
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }

    // GitHub needs Accept header for JSON
    if (provider === 'github') {
      headers['Accept'] = 'application/json'
    }

    const bodyParams: Record<string, string> = {
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }

    // Most providers want client_id/secret in body (not Notion)
    if (!isNotion) {
      bodyParams.client_id = clientId
      bodyParams.client_secret = clientSecret
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(bodyParams),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error(`Token exchange failed for ${provider}:`, tokenData)
      return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=token_exchange_failed`)
    }

    // Extract access token (varies by provider)
    const accessToken =
      tokenData.access_token ||
      tokenData.authed_user?.access_token ||
      tokenData.bot_token ||
      ''

    // Get user info for display
    let accountEmail = ''
    let accountName = ''
    const fetcher = USER_INFO_FETCHERS[provider] || defaultFetcher

    try {
      if (accessToken) {
        const info = await fetcher(accessToken)
        accountEmail = info.email
        accountName = info.name
      }
    } catch (e) {
      console.warn(`Failed to fetch user info for ${provider}:`, e)
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
      accessToken,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
      expiresAt,
      accountEmail,
      accountName,
      metadata: {
        team: tokenData.team?.name,
        teamId: tokenData.team?.id,
        instanceUrl: tokenData.instance_url,
        workspaceId: tokenData.workspace_id,
      },
    })

    return NextResponse.redirect(`${baseUrl}/workflows/connectors?connected=${provider}`)
  } catch (err: any) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${baseUrl}/workflows/connectors?error=${encodeURIComponent(err.message)}`)
  }
}
