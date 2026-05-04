import { db, getActiveWorkflowsByTriggerType, createRun } from '@/lib/db/queries'
import { workflowRun } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getValidAccessToken } from '@/lib/connectors/auth'
import { executeWorkflowRun } from './engine'

/**
 * Universal polling engine to check for new events across all connectors.
 * This simulates "Webhooks" for local development and environments without push support.
 */
export async function pollForEvents(): Promise<string[]> {
  const triggered: string[] = []
  
  // Find all active event-based workflows
  const eventWorkflows = await getActiveWorkflowsByTriggerType({
    triggerType: 'event',
  })

  for (const wf of eventWorkflows) {
    try {
      const triggerValue = (wf.triggerValue || '').toLowerCase()
      const triggerDesc = (wf.triggerDescription || '').toLowerCase()
      
      let newEventId: string | null = null
      let serviceName = ''

      // ─── 1. GMAIL / EMAIL ───
      if (triggerValue.includes('email') || triggerValue.includes('gmail')) {
        serviceName = 'email'
        const token = await getValidAccessToken(wf.userId, 'google')
        if (token) {
          // Look for any emails in the last hour, not just unread, to ensure we don't miss read ones.
          // Duplicates are handled by our database check in triggerIfNew.
          const query = triggerDesc.includes('subject') ? `${wf.triggerDescription}` : 'after:1h'
          const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (data.messages) {
            for (const msg of data.messages) {
              await triggerIfNew(wf, 'email', msg.id)
            }
          }
        }
      }

      // ─── 2. SLACK ───
      else if (triggerValue.includes('slack')) {
        serviceName = 'slack'
        const token = await getValidAccessToken(wf.userId, 'slack')
        if (token) {
          const channelMatch = wf.triggerDescription?.match(/#([a-zA-Z0-9_-]+)/) || triggerValue.match(/#([a-zA-Z0-9_-]+)/)
          const channel = channelMatch ? channelMatch[0] : 'general'
          
          const res = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (data.ok && data.messages) {
            for (const msg of data.messages) {
              await triggerIfNew(wf, 'slack', msg.ts)
            }
          }
        }
      }

      // ─── 3. NOTION ───
      else if (triggerValue.includes('notion')) {
        serviceName = 'notion'
        const token = await getValidAccessToken(wf.userId, 'notion')
        if (token) {
          const dbIdMatch = wf.triggerDescription?.match(/[a-f0-9]{32}/) || triggerValue.match(/[a-f0-9]{32}/)
          if (dbIdMatch) {
            const res = await fetch(`https://api.notion.com/v1/databases/${dbIdMatch[0]}/query?page_size=10`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28'
              }
            })
            const data = await res.json()
            if (data.results) {
              for (const page of data.results) {
                await triggerIfNew(wf, 'notion', page.id)
              }
            }
          }
        }
      }

      // ─── 4. HUBSPOT ───
      else if (triggerValue.includes('hubspot') || triggerValue.includes('crm')) {
        serviceName = 'hubspot'
        const token = await getValidAccessToken(wf.userId, 'hubspot')
        if (token) {
          const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=10&sort=-createdate`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (data.results) {
            for (const contact of data.results) {
              await triggerIfNew(wf, 'hubspot', contact.id)
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Polling] Error checking workflow ${wf.id}:`, err)
    }
  }

  return triggered
}

/**
 * Helper to check and trigger a run if the event is unique.
 */
async function triggerIfNew(wf: any, serviceName: string, eventId: string) {
  const triggerKey = `event:${serviceName}:${eventId}`
  
  const existingRun = await db.select().from(workflowRun).where(and(
    eq(workflowRun.workflowId, wf.id),
    eq(workflowRun.triggeredBy, triggerKey)
  )).limit(1)

  if (existingRun.length === 0) {
    console.log(`[Polling] New ${serviceName} event found: ${eventId}. Triggering ${wf.name}...`)
    const run = await createRun({
      workflowId: wf.id,
      userId: wf.userId,
      triggeredBy: triggerKey,
    })
    executeWorkflowRun(run.id, wf.userId).catch(e => console.error(`[Polling] Run failed:`, e))
    return true
  }
  return false
}
