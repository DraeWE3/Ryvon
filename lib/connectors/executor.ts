import { getValidAccessToken } from './auth'
import { generateText } from 'ai'
import { myProvider } from '@/lib/ai/providers'

// Map of friendly Agent names to DB provider IDs
const AGENT_TO_PROVIDER: Record<string, string> = {
  'Email': 'google',     // We use Gmail
  'Slack': 'slack',
  'CRM': 'hubspot',      // Defaulting CRM to hubspot for now
  'Calendar': 'google-calendar',
  'Sheets': 'google-sheets',
  'Webhook': 'http',
  'HTTP': 'http',
  'AI': 'ai',
  'Notion': 'notion',
}

interface ExecutorContext {
  userId: string
  step: any
  previousOutputs: string[]
}



export async function executeStep(context: ExecutorContext): Promise<string> {
  const { userId, step, previousOutputs } = context
  const provider = AGENT_TO_PROVIDER[step.agent] || step.agent.toLowerCase()

  // ──────────────────────────────────────────────────────────
  // 1. Built-in Handlers (AI & HTTP)
  // ──────────────────────────────────────────────────────────

  if (provider === 'ai') {
    return await executeAIStep(step, previousOutputs)
  }

  if (provider === 'http' || provider === 'webhook') {
    return await executeHttpStep(step)
  }

  // ──────────────────────────────────────────────────────────
  // 2. Auth-required Connectors
  // ──────────────────────────────────────────────────────────
  
  // Get token (automatically handles refresh via the auth module)
  let token = null
  if (provider === 'google' || provider === 'google-calendar' || provider === 'google-sheets') {
    // Check multiple possible Google tokens
    token = await getValidAccessToken(userId, provider) || await getValidAccessToken(userId, 'google')
  } else {
    token = await getValidAccessToken(userId, provider)
  }

  if (!token) {
    throw new Error(`Not connected to ${step.agent}. Please go to Connectors and connect your account.`)
  }

  // Route to specific API logic
  switch (provider) {
    case 'google':
      return await executeGmailStep(step, token)
    case 'slack':
      return await executeSlackStep(step, token)
    case 'notion':
      return await executeNotionStep(step, token)
    case 'hubspot':
      return await executeHubspotStep(step, token)
    default:
      // Fallback: If we don't have a hardcoded handler, we simulate it via AI but return a clear note
      // In production, we'd add handlers for all 44 connectors here.
      return `[Simulation - Missing Handler for ${step.agent}] Executed: ${step.action}`
  }
}

// ─── Specific Handlers ───

async function executeAIStep(step: any, previousOutputs: string[]): Promise<string> {
  const contextLines = previousOutputs.length > 0
    ? `\n\nPrevious step outputs:\n${previousOutputs.map((o, idx) => `Step ${idx + 1}: ${o}`).join('\n')}`
    : ''

  // Fallback to params if present
  let instruction = step.action || 'Process'
  if (step.params && step.params.prompt) {
    instruction = step.params.prompt
  }

  const { text: aiOutput } = await generateText({
    model: myProvider.languageModel('chat-model'),
    system: `You are an AI data processor inside an automated workflow.
      Your task is: ${instruction}
      ${step.params && Object.keys(step.params).length > 0 ? `Additional Parameters provided: ${JSON.stringify(step.params)}` : ''}
      Produce a concise, realistic output as if you successfully executed this step. Be specific. ${contextLines}`,
    prompt: `Execute this action based on the context. Only reply with the final result.`,
  })

  return aiOutput.trim()
}

async function executeHttpStep(step: any): Promise<string> {
  const url = step.params?.url || step.params?.endpoint
  if (!url) throw new Error('HTTP URL is required in parameters')

  const method = (step.params?.method || 'GET').toUpperCase()
  const headers = step.params?.headers ? JSON.parse(step.params.headers) : { 'Content-Type': 'application/json' }
  const body = step.params?.body ? JSON.stringify(step.params.body) : undefined

  const res = await fetch(url, { method, headers, ...(method !== 'GET' && { body }) })
  if (!res.ok) {
    throw new Error(`HTTP Request Failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.text()
  return `HTTP Request Successful. Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`
}

async function executeGmailStep(step: any, token: string): Promise<string> {
  const to = step.params?.to || step.params?.email
  const subject = step.params?.subject || 'Workflow automated message'
  let body = step.params?.body || step.params?.content || 'Hello from Ryvon workflows'

  if (!to) throw new Error('Email "to" parameter is missing')

  // Construct RFC 2822 email format
  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n')

  const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`Gmail Error: ${data.error?.message || 'Unknown error'}`)
  }

  return `Successfully sent email to ${to} (Message ID: ${data.id})`
}

async function executeSlackStep(step: any, token: string): Promise<string> {
  const channel = step.params?.channel || '#general'
  const text = step.params?.text || step.params?.message || 'Hello from Ryvon workflows'

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channel, text })
  })

  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(`Slack Error: ${data.error || 'Unknown error'}`)
  }

  return `Successfully posted message to Slack channel ${channel}`
}

async function executeNotionStep(step: any, token: string): Promise<string> {
  // Hardcoded simple page creation behavior for now
  const databaseId = step.params?.database_id || step.params?.database
  const title = step.params?.title || 'Automated Page'

  if (!databaseId) throw new Error('Notion "database_id" parameter is missing')

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      }
    })
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`Notion Error: ${data.message || 'Unknown error'}`)
  }

  return `Successfully created Notion page titled "${title}" (ID: ${data.id})`
}

// Hubspot
async function executeHubspotStep(step: any, token: string): Promise<string> {
  // Example: Create a contact
  const email = step.params?.email
  const firstname = step.params?.firstname || 'Automated'
  
  if (!email) throw new Error('HubSpot "email" parameter is missing')

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { email, firstname }
    })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`HubSpot Error: ${data.message || 'Unknown error'}`)
  }

  return `Successfully created HubSpot contact ${email} (ID: ${data.id})`
}
