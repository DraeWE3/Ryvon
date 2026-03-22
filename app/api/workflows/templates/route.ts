import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'

// Pre-built workflow templates users can deploy with one click
const templates = [
  {
    id: 'lead-nurture',
    name: 'Lead Nurture Sequence',
    description: 'Automatically follow up with new leads via email and CRM updates.',
    category: 'Sales',
    trigger_type: 'event',
    trigger_value: 'webhook:new_lead',
    trigger_description: 'Triggered when a new lead is created via webhook',
    steps: [
      { id: '1', agent: 'CRM', action: 'Fetch lead details and enrich profile', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Generate a personalized welcome email based on lead profile', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Email', action: 'Send the personalized welcome email to the lead', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'CRM', action: 'Update lead status to "Contacted" and log activity', params: {}, depends_on: ['3'] },
    ],
  },
  {
    id: 'daily-digest',
    name: 'Daily Morning Digest',
    description: 'Summarize email, calendar, and tasks into a morning briefing.',
    category: 'Productivity',
    trigger_type: 'cron',
    trigger_value: '0 8 * * *',
    trigger_description: 'Runs every day at 8:00 AM',
    steps: [
      { id: '1', agent: 'Email', action: 'Fetch the 10 most recent unread emails', params: {}, depends_on: [] },
      { id: '2', agent: 'Calendar', action: 'Fetch today\'s meetings and events', params: {}, depends_on: [] },
      { id: '3', agent: 'AI', action: 'Summarize emails and calendar into a concise morning briefing', params: {}, depends_on: ['1', '2'] },
      { id: '4', agent: 'Slack', action: 'Post the morning briefing to the #general channel', params: {}, depends_on: ['3'] },
    ],
  },
  {
    id: 'content-pipeline',
    name: 'Content Creation Pipeline',
    description: 'Generate blog content from a topic, optimize for SEO, and publish.',
    category: 'Marketing',
    trigger_type: 'manual',
    trigger_value: 'manual',
    trigger_description: 'Triggered manually when you want to create new content',
    steps: [
      { id: '1', agent: 'AI', action: 'Research the topic and generate a detailed outline', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Write a full blog post draft from the outline', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'AI', action: 'Optimize the draft for SEO with keywords and meta description', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'CMS', action: 'Publish the final blog post as a draft in the CMS', params: {}, depends_on: ['3'] },
    ],
  },
  {
    id: 'customer-onboarding',
    name: 'Customer Onboarding',
    description: 'Automate the onboarding flow for new customers with welcome messages and account setup.',
    category: 'Customer Success',
    trigger_type: 'event',
    trigger_value: 'webhook:new_customer',
    trigger_description: 'Triggered when a new customer signs up',
    steps: [
      { id: '1', agent: 'CRM', action: 'Create customer record and assign account manager', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Generate a personalized onboarding plan based on customer profile', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Email', action: 'Send welcome email with onboarding guide and login credentials', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'Slack', action: 'Notify the customer success team in #onboarding channel', params: {}, depends_on: ['3'] },
    ],
  },
  {
    id: 'support-escalation',
    name: 'Support Ticket Escalation',
    description: 'Automatically triage and escalate high-priority support tickets.',
    category: 'Support',
    trigger_type: 'event',
    trigger_value: 'webhook:new_ticket',
    trigger_description: 'Triggered when a new support ticket is created',
    steps: [
      { id: '1', agent: 'AI', action: 'Analyze ticket content and classify priority (low/medium/high/critical)', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Generate a suggested response based on knowledge base articles', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'Slack', action: 'If critical: alert on-call team in #urgent-support', params: {}, depends_on: ['1'] },
      { id: '4', agent: 'Helpdesk', action: 'Update ticket with AI classification, suggested response, and assign to agent', params: {}, depends_on: ['2', '3'] },
    ],
  },
  {
    id: 'social-monitor',
    name: 'Social Media Monitor',
    description: 'Track brand mentions and sentiment across social channels.',
    category: 'Marketing',
    trigger_type: 'cron',
    trigger_value: '0 */4 * * *',
    trigger_description: 'Runs every 4 hours',
    steps: [
      { id: '1', agent: 'HTTP', action: 'Fetch recent brand mentions from Twitter/X and Reddit APIs', params: {}, depends_on: [] },
      { id: '2', agent: 'AI', action: 'Analyze sentiment and identify notable mentions or complaints', params: {}, depends_on: ['1'] },
      { id: '3', agent: 'AI', action: 'Generate a summary report with actionable insights', params: {}, depends_on: ['2'] },
      { id: '4', agent: 'Slack', action: 'Post the sentiment report to #marketing channel', params: {}, depends_on: ['3'] },
    ],
  },
]

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  let filtered = templates
  if (category) {
    filtered = templates.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    )
  }

  return NextResponse.json(filtered)
}
