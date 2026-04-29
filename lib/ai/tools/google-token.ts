/**
 * Google OAuth Token Manager
 * Handles automatic token refresh for Gmail and other Google APIs.
 * Google tokens expire in ~1 hour. This utility ensures we always have a valid token.
 */
import { getConnectorByUserAndProvider, upsertConnectorAuth } from "@/lib/db/queries";
import type { ConnectorAuth } from "@/lib/db/schema";

interface ValidToken {
  accessToken: string;
  auth: ConnectorAuth;
}

/**
 * Gets a valid (non-expired) Google access token for a user.
 * Automatically refreshes if the token is expired or expiring within 5 minutes.
 * Returns null if the user has no connector or refresh fails.
 */
export async function getValidGoogleToken(userId: string, force = false): Promise<ValidToken | null> {
  const auth = await getConnectorByUserAndProvider({ userId, provider: "google" });
  if (!auth) {
    return null;
  }

  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer before expiry

  // Check if token needs refreshing
  const needsRefresh = force || (auth.expiresAt && (auth.expiresAt.getTime() - now.getTime() < bufferMs));

  if (needsRefresh || !auth.expiresAt) {
    if (!auth.refreshToken) {
      console.error("[Google Token] Token expired but no refresh token stored. User must re-authenticate.");
      // Even without a refresh token, we return the current one as a last resort
      return { 
        accessToken: auth.accessToken, 
        auth,
      };
    }

    try {
      console.log(`[Google Token] refreshing token for user ${userId} (force: ${force})...`);
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: auth.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      let refreshData: any = null;
      try {
        refreshData = await refreshRes.json();
      } catch (e) {
        console.error("[Google Token] Failed to parse refresh response:", e);
        return { accessToken: auth.accessToken, auth };
      }

      if (!refreshRes.ok || refreshData.error) {
        console.error("[Google Token] Refresh failed:", refreshData);
        // Return old token — may still work if expiry was set conservatively
        return { accessToken: auth.accessToken, auth };
      }

      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in ?? 3600) * 1000);

      // Persist the refreshed token back to the DB
      const updated = await upsertConnectorAuth({
        userId,
        provider: "google",
        accessToken: refreshData.access_token,
        // Google sometimes rotates the refresh token — preserve if not rotated
        refreshToken: refreshData.refresh_token ?? auth.refreshToken,
        tokenType: refreshData.token_type ?? "Bearer",
        scope: auth.scope ?? undefined,
        expiresAt: newExpiresAt,
        accountEmail: auth.accountEmail ?? undefined,
        accountName: auth.accountName ?? undefined,
        metadata: auth.metadata ?? undefined,
      });

      console.log("[Google Token] Successfully refreshed access token");
      return { accessToken: refreshData.access_token, auth: updated };
    } catch (err) {
      console.error("[Google Token] Exception during refresh:", err);
      return { accessToken: auth.accessToken, auth };
    }
  }

  return { accessToken: auth.accessToken, auth };
}

/**
 * Makes an authenticated request to the Gmail or Google API,
 * automatically retrying once with a refreshed token on 401.
 */
export async function googleFetch(
  url: string,
  userId: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: any; error?: string }> {
  const tokenResult = await getValidGoogleToken(userId);
  if (!tokenResult) {
    return { ok: false, data: null, error: "Google account not connected. Please connect Google in Connectors." };
  }

  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  };

  let res = await makeRequest(tokenResult.accessToken);

  // On 401, try a forced refresh once
  if (res.status === 401 && tokenResult.auth.refreshToken) {
    console.warn(`[Google Fetch] Got 401 for ${url}, forcing token refresh...`);
    // Force immediate refresh
    const freshToken = await getValidGoogleToken(userId, true);
    if (freshToken && freshToken.accessToken !== tokenResult.accessToken) {
      console.log("[Google Fetch] Retrying with new token...");
      res = await makeRequest(freshToken.accessToken);
    } else {
      console.error("[Google Fetch] Refresh did not provide a new token.");
    }
  }

  let data: any = null;
  const contentType = res.headers.get("content-type");
  
  try {
    if (contentType?.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("[Google Fetch] Non-JSON response:", text.slice(0, 200));
      return { ok: false, data: null, error: `Google API returned non-JSON response (HTTP ${res.status})` };
    }
  } catch (e) {
    console.error("[Google Fetch] Failed to parse JSON:", e);
    return { ok: false, data: null, error: `Failed to parse Google API response (HTTP ${res.status})` };
  }

  if (!res.ok) {
    const errMsg = data?.error?.message ?? data?.error ?? `HTTP ${res.status}`;
    console.error(`[Google Fetch] API Error (${res.status}):`, errMsg);
    return { ok: false, data, error: errMsg };
  }

  return { ok: true, data };
}
