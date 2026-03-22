import { NextRequest, NextResponse } from 'next/server'
import { deleteConnectorAuth } from '@/lib/db/queries'
import { auth } from '@/app/(auth)/auth'

// DELETE /api/connectors/[provider] — disconnect a provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider } = await params

  try {
    const result = await deleteConnectorAuth({
      userId: session.user.id,
      provider,
    })

    return NextResponse.json({ success: true, deleted: result })
  } catch (error) {
    console.error('Failed to disconnect connector:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
