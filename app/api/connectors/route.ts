import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getConnectorsByUserId } from '@/lib/db/queries'

// Full connector catalog organized by category
const CONNECTOR_CATALOG = [
  // ─── Communication ───
  {
    id: 'google',
    name: 'Gmail',
    icon: '✉️',
    description: 'Send and read emails via Gmail API.',
    category: 'Communication',
    actions: ['Send email', 'Read inbox', 'Search emails'],
    oauthSupported: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    description: 'Post messages, DMs, and manage Slack channels.',
    category: 'Communication',
    actions: ['Post message', 'Create channel', 'Send DM'],
    oauthSupported: true,
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    icon: '🟣',
    description: 'Chat, meetings, and channel management in Teams.',
    category: 'Communication',
    actions: ['Send message', 'Create meeting', 'Manage channels'],
    oauthSupported: false,
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    description: 'Send bot messages and manage Discord servers.',
    category: 'Communication',
    actions: ['Send message', 'Create channel', 'Manage roles'],
    oauthSupported: false,
  },
  {
    id: 'twilio',
    name: 'Twilio / SMS',
    icon: '📱',
    description: 'Send SMS and make voice calls via Twilio.',
    category: 'Communication',
    actions: ['Send SMS', 'Make call', 'Send WhatsApp'],
    oauthSupported: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: '📲',
    description: 'Send WhatsApp messages via Business API.',
    category: 'Communication',
    actions: ['Send message', 'Send template', 'Read messages'],
    oauthSupported: false,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    icon: '📨',
    description: 'Bulk email, transactional emails, and templates.',
    category: 'Communication',
    actions: ['Send email', 'Send template', 'Manage contacts'],
    oauthSupported: false,
  },

  // ─── Productivity ───
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: '📅',
    description: 'Create events, check availability, and manage calendars.',
    category: 'Productivity',
    actions: ['Create event', 'List events', 'Check availability'],
    oauthSupported: true,
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: '📊',
    description: 'Read and write data to Google Sheets spreadsheets.',
    category: 'Productivity',
    actions: ['Read rows', 'Write rows', 'Update cell'],
    oauthSupported: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📓',
    description: 'Create and update pages, databases, and blocks.',
    category: 'Productivity',
    actions: ['Create page', 'Update database', 'Search pages'],
    oauthSupported: false,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '🗃️',
    description: 'Read and write records in Airtable bases.',
    category: 'Productivity',
    actions: ['Create record', 'Update record', 'List records'],
    oauthSupported: false,
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '📋',
    description: 'Create cards, move between lists, and manage boards.',
    category: 'Productivity',
    actions: ['Create card', 'Move card', 'Add comment'],
    oauthSupported: false,
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '✅',
    description: 'Create tasks, update projects, and track progress.',
    category: 'Productivity',
    actions: ['Create task', 'Update task', 'Add to project'],
    oauthSupported: false,
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '🔷',
    description: 'Create issues, update sprints, and manage projects.',
    category: 'Productivity',
    actions: ['Create issue', 'Update issue', 'Transition status'],
    oauthSupported: false,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '📁',
    description: 'Upload, download, and manage files in Google Drive.',
    category: 'Productivity',
    actions: ['Upload file', 'Download file', 'Create folder'],
    oauthSupported: true,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '💧',
    description: 'File storage, sharing, and management.',
    category: 'Productivity',
    actions: ['Upload file', 'Download file', 'Share link'],
    oauthSupported: false,
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    icon: '🟠',
    description: 'Outlook, OneDrive, Word, and Excel integration.',
    category: 'Productivity',
    actions: ['Send email', 'Read calendar', 'Manage files'],
    oauthSupported: false,
  },

  // ─── Sales & CRM ───
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '🟧',
    description: 'Contacts, deals, pipelines, and marketing automation.',
    category: 'Sales & CRM',
    actions: ['Create contact', 'Update deal', 'Log activity', 'Send email'],
    oauthSupported: false,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: '☁️',
    description: 'Leads, opportunities, accounts, and reporting.',
    category: 'Sales & CRM',
    actions: ['Create lead', 'Update opportunity', 'Run report'],
    oauthSupported: false,
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    icon: '🟢',
    description: 'Deal tracking and contact management.',
    category: 'Sales & CRM',
    actions: ['Create deal', 'Update contact', 'Move stage'],
    oauthSupported: false,
  },
  {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    icon: '🔴',
    description: 'Leads, contacts, workflows, and analytics.',
    category: 'Sales & CRM',
    actions: ['Create lead', 'Update contact', 'Run workflow'],
    oauthSupported: false,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Payments, invoices, subscriptions, and billing.',
    category: 'Sales & CRM',
    actions: ['Create invoice', 'Check payment', 'Manage subscription'],
    oauthSupported: false,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    description: 'Payment processing and transaction management.',
    category: 'Sales & CRM',
    actions: ['Send payment', 'Create invoice', 'Check balance'],
    oauthSupported: false,
  },

  // ─── Support ───
  {
    id: 'zendesk',
    name: 'Zendesk',
    icon: '🎧',
    description: 'Tickets, agents, and knowledge base management.',
    category: 'Support',
    actions: ['Create ticket', 'Update ticket', 'Assign agent'],
    oauthSupported: false,
  },
  {
    id: 'intercom',
    name: 'Intercom',
    icon: '💬',
    description: 'Live chat, customer messages, and user data.',
    category: 'Support',
    actions: ['Send message', 'Create conversation', 'Tag user'],
    oauthSupported: false,
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    icon: '🟩',
    description: 'Support tickets, SLA management, and automation.',
    category: 'Support',
    actions: ['Create ticket', 'Update priority', 'Assign agent'],
    oauthSupported: false,
  },
  {
    id: 'crisp',
    name: 'Crisp',
    icon: '💭',
    description: 'Chat widget, conversations, and visitor tracking.',
    category: 'Support',
    actions: ['Send message', 'Resolve conversation', 'Add note'],
    oauthSupported: false,
  },

  // ─── Marketing ───
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    icon: '🐵',
    description: 'Email campaigns, audience management, and analytics.',
    category: 'Marketing',
    actions: ['Send campaign', 'Add subscriber', 'Create template'],
    oauthSupported: false,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: '🐦',
    description: 'Post tweets, read mentions, and track hashtags.',
    category: 'Marketing',
    actions: ['Post tweet', 'Read mentions', 'Search hashtags'],
    oauthSupported: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '🔵',
    description: 'Post updates, manage connections, and lead gen.',
    category: 'Marketing',
    actions: ['Post update', 'Send InMail', 'Search profiles'],
    oauthSupported: false,
  },
  {
    id: 'meta',
    name: 'Meta (Facebook / Instagram)',
    icon: '📘',
    description: 'Post content, manage ads, and track engagement.',
    category: 'Marketing',
    actions: ['Create post', 'Manage ad', 'Read insights'],
    oauthSupported: false,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: '📝',
    description: 'Publish blog posts, manage pages, and update content.',
    category: 'Marketing',
    actions: ['Create post', 'Update page', 'Upload media'],
    oauthSupported: false,
  },
  {
    id: 'webflow',
    name: 'Webflow',
    icon: '🌊',
    description: 'CMS collection management and site publishing.',
    category: 'Marketing',
    actions: ['Create item', 'Update item', 'Publish site'],
    oauthSupported: false,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    icon: '📈',
    description: 'Read traffic data, events, and generate reports.',
    category: 'Marketing',
    actions: ['Get report', 'Read real-time data', 'Track conversion'],
    oauthSupported: true,
  },

  // ─── Developer ───
  {
    id: 'http',
    name: 'HTTP / Webhook',
    icon: '🌐',
    description: 'Make HTTP requests or receive incoming webhooks.',
    category: 'Developer',
    actions: ['GET request', 'POST request', 'Receive webhook'],
    oauthSupported: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Create issues, pull requests, and manage repos.',
    category: 'Developer',
    actions: ['Create issue', 'Create PR', 'List repos'],
    oauthSupported: false,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: '🦊',
    description: 'CI/CD, issues, merge requests, and pipelines.',
    category: 'Developer',
    actions: ['Create issue', 'Trigger pipeline', 'Create MR'],
    oauthSupported: false,
  },
  {
    id: 'aws',
    name: 'AWS (S3, Lambda)',
    icon: '☁️',
    description: 'Cloud storage, serverless functions, and more.',
    category: 'Developer',
    actions: ['Upload to S3', 'Invoke Lambda', 'Send SQS message'],
    oauthSupported: false,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: '⚡',
    description: 'Database queries, auth management, and storage.',
    category: 'Developer',
    actions: ['Insert row', 'Query data', 'Upload file'],
    oauthSupported: false,
  },
  {
    id: 'firebase',
    name: 'Firebase',
    icon: '🔥',
    description: 'Realtime database, auth, and push notifications.',
    category: 'Developer',
    actions: ['Write data', 'Read data', 'Send notification'],
    oauthSupported: false,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: '🐘',
    description: 'Run direct SQL queries against your database.',
    category: 'Developer',
    actions: ['SELECT query', 'INSERT row', 'UPDATE row'],
    oauthSupported: false,
  },

  // ─── AI ───
  {
    id: 'ai',
    name: 'Ryvon AI',
    icon: '🤖',
    description: 'Use AI to generate text, analyze data, or make decisions.',
    category: 'AI',
    actions: ['Generate text', 'Summarize', 'Classify', 'Extract data'],
    oauthSupported: false,
  },
  {
    id: 'openai',
    name: 'OpenAI (Direct)',
    icon: '🧠',
    description: 'GPT models, DALL·E image generation, and Whisper.',
    category: 'AI',
    actions: ['Chat completion', 'Generate image', 'Transcribe audio'],
    oauthSupported: false,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🎙️',
    description: 'Text-to-speech with natural, human-like voices.',
    category: 'AI',
    actions: ['Generate speech', 'Clone voice', 'List voices'],
    oauthSupported: false,
  },
  {
    id: 'replicate',
    name: 'Replicate',
    icon: '🎨',
    description: 'Run open-source AI models for images, video, and more.',
    category: 'AI',
    actions: ['Generate image', 'Run model', 'Upscale image'],
    oauthSupported: false,
  },

  // ─── E-commerce ───
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    description: 'Manage orders, products, customers, and inventory.',
    category: 'E-commerce',
    actions: ['Create order', 'Update product', 'List customers'],
    oauthSupported: false,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    icon: '🛒',
    description: 'WordPress e-commerce — products, orders, and coupons.',
    category: 'E-commerce',
    actions: ['Create product', 'Update order', 'Apply coupon'],
    oauthSupported: false,
  },
  {
    id: 'gumroad',
    name: 'Gumroad',
    icon: '💰',
    description: 'Digital product sales and membership management.',
    category: 'E-commerce',
    actions: ['List products', 'Check sales', 'Manage subscribers'],
    oauthSupported: false,
  },
]

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's connected connectors from DB
    const connected = await getConnectorsByUserId({ userId: session.user.id })
    const connectedMap = new Map(
      connected.map((c) => [c.provider, c])
    )

    // Merge catalog with real connection status
    const enriched = CONNECTOR_CATALOG.map((connector) => {
      const auth = connectedMap.get(connector.id)
      // Google OAuth covers multiple Google tools
      const googleAuth = connectedMap.get('google')
      const isGoogleTool = ['google', 'google-calendar', 'google-sheets', 'google-drive', 'google-analytics'].includes(connector.id)
      const resolvedAuth = auth || (isGoogleTool ? googleAuth : null)

      return {
        ...connector,
        connected: connector.id === 'ai' || connector.id === 'http'
          ? true
          : !!resolvedAuth,
        accountEmail: resolvedAuth?.accountEmail || null,
        accountName: resolvedAuth?.accountName || null,
        connectedAt: resolvedAuth?.connectedAt || null,
        expiresAt: resolvedAuth?.expiresAt || null,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Failed to get connectors:', error)
    return NextResponse.json(
      { error: 'Failed to get connectors' },
      { status: 500 }
    )
  }
}
