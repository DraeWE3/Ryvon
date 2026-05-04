import { getValidAccessToken } from './auth'
import { generateText } from 'ai'
import { myProvider } from '@/lib/ai/providers'

// Map of friendly Agent names to DB provider IDs
const AGENT_TO_PROVIDER: Record<string, string> = {
  'Email': 'google',     // We use Gmail
  'Slack': 'slack',
  'CRM': 'hubspot',      // Defaulting CRM to hubspot for now
  'Calendar': 'google',  // All Google services share one OAuth token
  'Sheets': 'google',    // All Google services share one OAuth token
  'Google Sheets': 'google',
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
  const agentName = step.agent || ''
  const provider = AGENT_TO_PROVIDER[agentName] || agentName.toLowerCase()
  const action = (step.action || '').toLowerCase()

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
  const token = await getValidAccessToken(userId, provider)

  if (!token) {
    throw new Error(`Not connected to ${step.agent}. Please go to Connectors and connect your account.`)
  }

  // ──────────────────────────────────────────────────────────
  // 3. Route based on both agent name AND action description
  // ──────────────────────────────────────────────────────────

  // Detect what kind of Google operation this is
  const isSheets = agentName === 'Sheets' || agentName === 'Google Sheets' || 
                   action.includes('sheet') || action.includes('spreadsheet') || action.includes('append')
  const isCalendar = agentName === 'Calendar' || action.includes('calendar') || action.includes('event')
  const isEmailRead = action.includes('check') || action.includes('read') || action.includes('fetch') || 
                      action.includes('search') || action.includes('inbox') || action.includes('monitor') ||
                      action.includes('subject')
  const isEmailSend = action.includes('send') || action.includes('reply') || action.includes('compose')

  if (provider === 'google') {
    if (isSheets) {
      return await executeGoogleSheetsStep(step, token, previousOutputs)
    }
    if (isEmailRead) {
      return await executeGmailReadStep(step, token)
    }
    if (isEmailSend) {
      return await executeGmailSendStep(step, token)
    }
    // Default Gmail behavior: try to detect from params
    if (step.params?.to) {
      return await executeGmailSendStep(step, token)
    }
    // Fallback: read emails
    return await executeGmailReadStep(step, token)
  }

  switch (provider) {
    case 'slack':
      return await executeSlackStep(step, token)
    case 'notion':
      return await executeNotionStep(step, token)
    case 'hubspot':
      return await executeHubspotStep(step, token)
    default:
      return `[Simulation - Missing Handler for ${step.agent}] Executed: ${step.action}`
  }
}

// ─── Gmail: Read Emails ───

async function executeGmailReadStep(step: any, token: string): Promise<string> {
  // Build a search query from step params or action description
  let query = step.params?.query || step.params?.subject || ''
  if (!query && step.action) {
    // Try to extract a subject filter from the action description
    const subjectMatch = step.action.match(/subject[:\s]*['""]?([^'""\n]+)/i)
    if (subjectMatch) {
      query = `subject:${subjectMatch[1].trim()}`
    }
  }
  if (!query) {
    query = 'is:unread'
  } else if (!query.startsWith('subject:') && !query.includes(':')) {
    query = `subject:${query}`
  }

  const maxResults = step.params?.maxResults || 5

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`Gmail Error: ${data.error?.message || 'Unknown error'}`)
  }

  if (!data.messages || data.messages.length === 0) {
    return `No emails found matching query "${query}"`
  }

  // Fetch details for each message
  const emailSummaries: string[] = []
  const messagesToFetch = data.messages.slice(0, 3) // Limit to first 3

  for (const msg of messagesToFetch) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    const detail = await detailRes.json()
    if (detail.payload?.headers) {
      const headers: Record<string, string> = {}
      for (const h of detail.payload.headers) {
        headers[h.name] = h.value
      }
      emailSummaries.push(
        `- From: ${headers['From'] || 'Unknown'} | Subject: ${headers['Subject'] || 'No subject'} | Date: ${headers['Date'] || 'Unknown'}`
      )
    }
  }

  return `Found ${data.messages.length} email(s) matching "${query}":\n${emailSummaries.join('\n')}`
}

// ─── Gmail: Send Email ───

async function executeGmailSendStep(step: any, token: string): Promise<string> {
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

// ─── Google Sheets ───

async function executeGoogleSheetsStep(step: any, token: string, previousOutputs: string[]): Promise<string> {
  const spreadsheetName = step.params?.spreadsheet || step.params?.sheet || step.params?.name || ''
  const range = step.params?.range || 'Sheet1!A1'
  const action = (step.action || '').toLowerCase()
  
  // If we have a spreadsheetId directly, use it
  let spreadsheetId = step.params?.spreadsheetId || step.params?.spreadsheet_id || ''

  // If no ID, try to find by name
  if (!spreadsheetId && spreadsheetName) {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(spreadsheetName)}'+and+mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const searchData = await searchRes.json()
    if (searchData.files && searchData.files.length > 0) {
      spreadsheetId = searchData.files[0].id
    }
  }

  // If still no ID, create a new spreadsheet
  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: spreadsheetName || 'Ryvon Workflow Data' }
      })
    })
    const createData = await createRes.json()
    if (!createRes.ok || createData.error) {
      throw new Error(`Sheets Error: ${createData.error?.message || 'Failed to create spreadsheet'}`)
    }
    spreadsheetId = createData.spreadsheetId
  }

  // Determine what data to append
  let values: string[][] = []
  
  if (step.params?.values) {
    // Explicit values provided
    if (Array.isArray(step.params.values)) {
      if (step.params.values.length > 0 && Array.isArray(step.params.values[0])) {
        values = step.params.values
      } else {
        values = [step.params.values]
      }
    } else {
      values = [[String(step.params.values)]]
    }
  } else if (previousOutputs.length > 0) {
    const lastOutput = previousOutputs[previousOutputs.length - 1]
    const timestamp = new Date().toLocaleString()

    // Try to parse JSON from AI output and spread into columns
    let parsed: Record<string, any> | null = null
    try {
      // Extract JSON from the output (AI might wrap it in markdown code blocks)
      const jsonMatch = lastOutput.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        lastOutput.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim())
      }
    } catch {
      // Not JSON, use as-is
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Spread JSON keys into separate columns: [timestamp, key1_value, key2_value, ...]
      const keys = Object.keys(parsed)
      const headerRow = ['Date', ...keys.map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))]
      const dataRow = [timestamp, ...keys.map(k => String(parsed![k] ?? ''))]

      // Check if sheet is empty (first run) — add headers
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const checkData = await checkRes.json()
      const isEmpty = !checkData.values || checkData.values.length === 0

      if (isEmpty) {
        values = [headerRow, dataRow]
      } else {
        values = [dataRow]
      }
    } else {
      values = [[timestamp, lastOutput]]
    }
  } else {
    values = [[new Date().toLocaleString(), 'Workflow executed']]
  }

  // Append rows
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  )

  const appendData = await appendRes.json()
  if (!appendRes.ok || appendData.error) {
    throw new Error(`Sheets Error: ${appendData.error?.message || 'Failed to append data'}`)
  }

  return `Successfully appended ${values.length} row(s) to spreadsheet "${spreadsheetName || spreadsheetId}" at ${appendData.updates?.updatedRange || range}`
}

// ─── AI Step ───

async function executeAIStep(step: any, previousOutputs: string[]): Promise<string> {
  const contextLines = previousOutputs.length > 0
    ? `\n\nPrevious step outputs:\n${previousOutputs.map((o, idx) => `Step ${idx + 1}: ${o}`).join('\n')}`
    : ''

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

// ─── HTTP Step ───

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

// ─── Slack ───

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

// ─── Notion ───

async function executeNotionStep(step: any, token: string): Promise<string> {
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

// ─── HubSpot ───

async function executeHubspotStep(step: any, token: string): Promise<string> {
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
