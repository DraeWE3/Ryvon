import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkflowsByUserId,
  createWorkflow,
} from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'
import { generateText } from 'ai'
import { myProvider } from '@/lib/ai/providers'

// GET /api/workflows?user_id=...
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const workflows = await getWorkflowsByUserId({ userId: session.user.id })
    return NextResponse.json(workflows)
  } catch (error) {
    console.error('Failed to fetch workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

// POST /api/workflows — generate a workflow from natural language using AI, then save it
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.type === "guest") {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { input } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid input field' },
        { status: 400 }
      )
    }

    // Use the same AI provider as chat to generate a structured workflow
    const systemPrompt = `You are Ryvon's workflow builder. Given a user's natural language description, generate a structured workflow JSON object.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "name": "Short workflow name",
  "category": "One of: Sales, Productivity, Customer Support, Marketing, Team productivity, General",
  "icon": "One of: Calendar, Mail, FileText, Headphones, ImageIcon, Star, Zap",
  "trigger_type": "cron" | "event" | "manual",
  "trigger_value": "e.g. 0 8 * * * for daily 8am, or webhook:new_lead, or manual",
  "trigger_description": "Human-readable description of when this triggers",
  "steps": [
    {
      "id": "1",
      "agent": "Agent name (e.g. Email, Slack, CRM, AI, HTTP)",
      "action": "What this step does",
      "params": {},
      "depends_on": []
    }
  ]
}`

    const { text } = await generateText({
      model: myProvider.languageModel('chat-model'),
      system: systemPrompt,
      prompt: input,
      maxOutputTokens: 1000,
    })

    // Parse the AI response
    let parsed: any
    try {
      // Strip markdown fences if AI added them
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('AI returned invalid JSON:', text)
      return NextResponse.json(
        { error: 'AI generated an invalid workflow. Please try again.' },
        { status: 422 }
      )
    }

    // Save to the database
    const saved = await createWorkflow({
      userId: session.user.id,
      name: parsed.name || input.slice(0, 60),
      category: parsed.category || "General",
      icon: parsed.icon || "Workflow",
      triggerType: parsed.trigger_type || 'manual',
      triggerValue: parsed.trigger_value || 'manual',
      triggerDescription: parsed.trigger_description || input,
      steps: parsed.steps || [],
      active: true,
    })

    // Return the full saved object merged with the AI-generated preview fields
    return NextResponse.json({
      ...saved,
      trigger_type: saved.triggerType,
      trigger_value: saved.triggerValue,
      trigger_description: saved.triggerDescription,
    })
  } catch (error) {
    console.error('Workflow creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
