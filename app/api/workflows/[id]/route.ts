import { NextRequest, NextResponse } from 'next/server'
import { getWorkflowById, updateWorkflow, deleteWorkflowById } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const wf = await getWorkflowById({ id })
    if (!wf) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({
      ...wf,
      trigger_type: wf.triggerType,
      trigger_value: wf.triggerValue,
      trigger_description: wf.triggerDescription,
    })
  } catch (error) {
    console.error('Failed to get workflow:', error)
    return NextResponse.json({ error: 'Failed to get workflow' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const result = await updateWorkflow({ id, data: body })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update workflow:', error)
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await deleteWorkflowById({ id })
    return NextResponse.json({ success: true, deleted: result })
  } catch (error) {
    console.error('Failed to delete workflow:', error)
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
  }
}
