import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { upsertConnectorAuth } from '@/lib/db/queries'

// POST /api/connectors/manual — save an API key for a non-OAuth provider
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { provider, apiKey, accountName } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
    }

    // Upsert the API key into the DB.
    // We store it in `accessToken` since for non-OAuth, the API key acts as the token.
    await upsertConnectorAuth({
      userId: session.user.id,
      provider,
      accessToken: apiKey,
      tokenType: 'API_KEY',
      accountName: accountName || 'Manual API Key',
    })

    return NextResponse.json({ success: true, provider })
  } catch (error: any) {
    console.error('Failed to save manual API key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save API key' },
      { status: 500 }
    )
  }
}
