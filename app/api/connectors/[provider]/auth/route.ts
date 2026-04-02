import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'

// OAuth provider configurations
// Each provider that supports OAuth is registered here.
// Add your CLIENT_ID / CLIENT_SECRET to .env.local for each one.
export const OAUTH_PROVIDERS: Record<string, {
  authUrl: string
  tokenUrl: string
  clientIdEnv: string
  clientSecretEnv: string
  scopes: string[]
  name: string
  extraAuthParams?: Record<string, string>
}> = {
  // ─── Google (Gmail, Calendar, Sheets, Drive, Analytics) ───
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    name: 'Google',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },

  // ─── Slack ───
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    scopes: ['channels:read', 'chat:write', 'users:read', 'channels:manage'],
    name: 'Slack',
  },

  // ─── Notion ───
  notion: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    clientIdEnv: 'NOTION_CLIENT_ID',
    clientSecretEnv: 'NOTION_CLIENT_SECRET',
    scopes: [],
    name: 'Notion',
    extraAuthParams: { owner: 'user' },
  },

  // ─── HubSpot ───
  hubspot: {
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
    name: 'HubSpot',
  },



  // ─── Airtable ───
  airtable: {
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    clientIdEnv: 'AIRTABLE_CLIENT_ID',
    clientSecretEnv: 'AIRTABLE_CLIENT_SECRET',
    scopes: ['data.records:read', 'data.records:write', 'schema.bases:read'],
    name: 'Airtable',
  },

  // ─── Asana ───
  asana: {
    authUrl: 'https://app.asana.com/-/oauth_authorize',
    tokenUrl: 'https://app.asana.com/-/oauth_token',
    clientIdEnv: 'ASANA_CLIENT_ID',
    clientSecretEnv: 'ASANA_CLIENT_SECRET',
    scopes: ['default'],
    name: 'Asana',
  },

  // ─── Trello ───
  trello: {
    authUrl: 'https://trello.com/1/authorize',
    tokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
    clientIdEnv: 'TRELLO_CLIENT_ID',
    clientSecretEnv: 'TRELLO_CLIENT_SECRET',
    scopes: ['read', 'write'],
    name: 'Trello',
    extraAuthParams: { expiration: 'never' },
  },

  // ─── Dropbox ───
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientIdEnv: 'DROPBOX_CLIENT_ID',
    clientSecretEnv: 'DROPBOX_CLIENT_SECRET',
    scopes: ['files.content.read', 'files.content.write', 'sharing.read'],
    name: 'Dropbox',
    extraAuthParams: { token_access_type: 'offline' },
  },

  // ─── Discord ───
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
    scopes: ['identify', 'guilds', 'bot', 'messages.read'],
    name: 'Discord',
  },

  // ─── GitHub ───
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    scopes: ['repo', 'read:user', 'user:email'],
    name: 'GitHub',
  },

  // ─── LinkedIn ───
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    name: 'LinkedIn',
  },

  // ─── Shopify ───
  shopify: {
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    clientIdEnv: 'SHOPIFY_CLIENT_ID',
    clientSecretEnv: 'SHOPIFY_CLIENT_SECRET',
    scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_customers'],
    name: 'Shopify',
  },

  // ─── Stripe ───
  stripe: {
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    clientIdEnv: 'STRIPE_CONNECT_CLIENT_ID',
    clientSecretEnv: 'STRIPE_SECRET_KEY',
    scopes: ['read_write'],
    name: 'Stripe',
    extraAuthParams: { response_type: 'code' },
  },

  // ─── Zendesk ───
  zendesk: {
    authUrl: 'https://{subdomain}.zendesk.com/oauth/authorizations/new',
    tokenUrl: 'https://{subdomain}.zendesk.com/oauth/tokens',
    clientIdEnv: 'ZENDESK_CLIENT_ID',
    clientSecretEnv: 'ZENDESK_CLIENT_SECRET',
    scopes: ['read', 'write', 'tickets:read', 'tickets:write'],
    name: 'Zendesk',
  },

  // ─── Intercom ───
  intercom: {
    authUrl: 'https://app.intercom.com/oauth',
    tokenUrl: 'https://api.intercom.io/auth/eagle/token',
    clientIdEnv: 'INTERCOM_CLIENT_ID',
    clientSecretEnv: 'INTERCOM_CLIENT_SECRET',
    scopes: [],
    name: 'Intercom',
  },

  // ─── Mailchimp ───
  mailchimp: {
    authUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    clientIdEnv: 'MAILCHIMP_CLIENT_ID',
    clientSecretEnv: 'MAILCHIMP_CLIENT_SECRET',
    scopes: [],
    name: 'Mailchimp',
  },

  // ─── Microsoft 365 (Teams, Outlook, OneDrive) ───
  'microsoft-365': {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientIdEnv: 'MICROSOFT_365_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_365_CLIENT_SECRET',
    scopes: ['openid', 'profile', 'email', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite', 'Files.ReadWrite', 'Team.ReadBasic.All', 'Chat.ReadWrite'],
    name: 'Microsoft 365',
  },

  // ─── Meta (Facebook / Instagram) ───
  meta: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    scopes: ['public_profile', 'email', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'],
    name: 'Meta',
  },

  // ─── Zoho CRM ───
  'zoho-crm': {
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    clientIdEnv: 'ZOHO_CRM_CLIENT_ID',
    clientSecretEnv: 'ZOHO_CRM_CLIENT_SECRET',
    scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.settings.ALL'],
    name: 'Zoho CRM',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },

  // ─── Pipedrive ───
  pipedrive: {
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    clientIdEnv: 'PIPEDRIVE_CLIENT_ID',
    clientSecretEnv: 'PIPEDRIVE_CLIENT_SECRET',
    scopes: [],
    name: 'Pipedrive',
  },

  // ─── Freshdesk ───
  freshdesk: {
    authUrl: 'https://accounts.freshworks.com/authorize',
    tokenUrl: 'https://accounts.freshworks.com/oauth/token',
    clientIdEnv: 'FRESHDESK_CLIENT_ID',
    clientSecretEnv: 'FRESHDESK_CLIENT_SECRET',
    scopes: [],
    name: 'Freshdesk',
  },

  // ─── Webflow ───
  webflow: {
    authUrl: 'https://webflow.com/oauth/authorize',
    tokenUrl: 'https://api.webflow.com/oauth/access_token',
    clientIdEnv: 'WEBFLOW_CLIENT_ID',
    clientSecretEnv: 'WEBFLOW_CLIENT_SECRET',
    scopes: [],
    name: 'Webflow',
  },

  // ─── Jira (Atlassian) ───
  jira: {
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    clientIdEnv: 'JIRA_CLIENT_ID',
    clientSecretEnv: 'JIRA_CLIENT_SECRET',
    scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user', 'offline_access'],
    name: 'Jira',
    extraAuthParams: { audience: 'api.atlassian.com', prompt: 'consent' },
  },

  // ─── GitLab ───
  gitlab: {
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    clientIdEnv: 'GITLAB_CLIENT_ID',
    clientSecretEnv: 'GITLAB_CLIENT_SECRET',
    scopes: ['api', 'read_user', 'read_repository'],
    name: 'GitLab',
  },

  // ─── Dropbox ───
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientIdEnv: 'DROPBOX_CLIENT_ID',
    clientSecretEnv: 'DROPBOX_CLIENT_SECRET',
    scopes: ['files.content.read', 'files.content.write', 'files.metadata.read', 'account_info.read'],
    name: 'Dropbox',
    extraAuthParams: { token_access_type: 'offline' },
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
