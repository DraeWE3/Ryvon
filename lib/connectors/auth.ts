import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/queries'
import { connectorAuth } from '@/lib/db/schema'
import { OAUTH_PROVIDERS } from '@/lib/connectors/providers'

/**
 * Retrieves a valid access token for the given user and provider.
 * If the current token is expired (or expires soon) and a refresh token exists,
 * it attempts to fetch a new token, updates the database, and returns the new token.
 */
export async function getValidAccessToken(userId: string, provider: string): Promise<string | null> {
  const [authRecord] = await db
    .select()
    .from(connectorAuth)
    .where(
      and(
        eq(connectorAuth.userId, userId),
        eq(connectorAuth.provider, provider)
      )
    )

  if (!authRecord) {
    return null
  }

  // If no expiration, or it's a manual API key, just return it
  if (!authRecord.expiresAt || authRecord.tokenType === 'API_KEY') {
    return authRecord.accessToken
  }

  // Check if expired or expires in the next 5 minutes
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5 mins
  const expiresAt = new Date(authRecord.expiresAt)

  if (now.getTime() + bufferTime >= expiresAt.getTime()) {
    // Token is expired/expiring soon, attempt refresh
    return await refreshAccessToken(authRecord)
  }

  return authRecord.accessToken
}

/**
 * Exchanges a refresh token for a new access token
 */
async function refreshAccessToken(authRecord: any): Promise<string | null> {
  if (!authRecord.refreshToken) {
    console.warn(`No refresh token available for user ${authRecord.userId} / ${authRecord.provider}`)
    return null
  }

  const providerConfig = OAUTH_PROVIDERS[authRecord.provider]
  if (!providerConfig) {
    console.warn(`Unknown provider in config: ${authRecord.provider}`)
    return null
  }

  const clientId = process.env[providerConfig.clientIdEnv]
  const clientSecret = process.env[providerConfig.clientSecretEnv]

  if (!clientId || !clientSecret) {
    console.warn(`Missing env config for ${authRecord.provider}`)
    return null
  }

  try {
    const isNotion = authRecord.provider === 'notion'
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    if (isNotion) {
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }

    const bodyParams: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: authRecord.refreshToken,
    }

    if (!isNotion) {
      bodyParams.client_id = clientId
      bodyParams.client_secret = clientSecret
    }

    const res = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(bodyParams),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      console.error(`Failed to refresh token for ${authRecord.provider}:`, data)
      // If refresh fails, we might invalidate the connection or just return null
      return null
    }

    const newAccessToken = data.access_token || data.bot_token
    const newRefreshToken = data.refresh_token || authRecord.refreshToken
    
    let newExpiresAt: Date | null = null
    if (data.expires_in) {
      newExpiresAt = new Date(Date.now() + data.expires_in * 1000)
    }

    // Update the database
    await db
      .update(connectorAuth)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(connectorAuth.id, authRecord.id))

    return newAccessToken

  } catch (error) {
    console.error(`Exception during token refresh for ${authRecord.provider}:`, error)
    return null
  }
}
