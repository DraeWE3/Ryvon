import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { workflow, user } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

const sql = postgres(process.env.POSTGRES_URL!)
const db = drizzle(sql)

const templates = [
  {
    id: 'ai-sales-assistant',
    name: 'AI Sales Assistant Workflow',
    category: 'Sales',
    triggerType: 'event' as const,
    triggerValue: 'webhook:new_lead',
    triggerDescription: 'Triggered when a lead comes from website form or ad',
    steps: [
      { id: '1', agent: 'AI', action: 'Qualify lead and analyze budget, need, timeline', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Draft personalized outreach message requesting a meeting', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Email', action: 'Send confirmation email and meeting link to lead', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'CRM', action: 'Create contact in CRM and summarize lead profile', params: {}, depends_on: ['1'] },
      { id: '5', agent: 'Slack', action: 'Send immediate alert to founder with summary', params: {}, depends_on: ['4'] },
    ],
  },
  {
    id: 'smart-client-onboarding',
    name: 'Smart Client Onboarding Flow',
    category: 'Operations',
    triggerType: 'event' as const,
    triggerValue: 'webhook:client_closed',
    triggerDescription: 'Triggered when a client is marked as "Closed"',
    steps: [
      { id: '1', agent: 'CRM', action: 'Fetch closed client details and service requirements', params: {}, depends_on: [] },
      { id: '2', agent: 'Email', action: 'Send automated welcome message with onboarding form', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Notion', action: 'Create private project workspace for client data', params: {}, depends_on: ['1'] },
      { id: '4', agent: 'Calendar', action: 'Schedule automatic kickoff call', params: {}, depends_on: ['1'] },
      { id: '5', agent: 'Slack', action: 'Assign internal setup tasks to operations team', params: {}, depends_on: ['3'] },
    ],
  },
  {
    id: 'ai-follow-up-engine',
    name: 'AI Follow-Up & Nurture System',
    category: 'Retention',
    triggerType: 'cron' as const,
    triggerValue: '0 9 * * *',
    triggerDescription: 'Runs daily at 9:00 AM to check for inactive leads',
    steps: [
      { id: '1', agent: 'CRM', action: 'Fetch leads or clients inactive for X days', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Draft smart follow-up message sharing relevant updates or offers', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Email', action: 'Send proactive follow-up message to revive lead', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'CRM', action: 'Log interaction and update pipeline status', params: {}, depends_on: ['3'] },
      { id: '5', agent: 'Slack', action: 'Notify sales owner immediately if lead is considered hot', params: {}, depends_on: ['4'] },
    ],
  },
]

async function main() {
  console.log('Fetching all users...')
  const users = await db.select().from(user)

  if (users.length === 0) {
    console.error('No users found in database. Cannot associate workflows.')
    process.exit(1)
  }

  for (const u of users) {
    console.log(`Inserting workflows for user ${u.email || u.id}...`)

    for (const t of templates) {
      // Check if workflow already exists to avoid duplicates
      const existing = await db.select().from(workflow).where(
        and(
          eq(workflow.userId, u.id),
          eq(workflow.name, t.name)
        )
      ).catch((e) => {
        console.error(e)
        return []
      })

      if (existing && existing.length > 0) {
        console.log(`Skipping: ${t.name} (already exists)`)
        continue
      }

      await db.insert(workflow).values({
        userId: u.id,
        name: t.name,
        triggerType: t.triggerType,
        triggerValue: t.triggerValue,
        triggerDescription: t.triggerDescription,
        category: t.category,
        steps: t.steps,
        active: true,
        icon: 'Workflow',
      })
      console.log(`Inserted: ${t.name}`)
    }
  }

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
