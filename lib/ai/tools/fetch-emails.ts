import { tool } from "ai";
import { z } from "zod";
import { getConnectorByUserAndProvider } from "@/lib/db/queries";
import type { Session } from "next-auth";
import { googleFetch } from "./google-token";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailResult {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  provider: "google" | "microsoft-365";
  threadId?: string;
}

// ── Gmail helpers ─────────────────────────────────────────────────────────────

async function getGmailUnreadCount(userId: string): Promise<{ unread: number; total: number; error?: string } | null> {
  // The Gmail labels endpoint gives instant unread/total counts for the inbox
  const result = await googleFetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX",
    userId
  );

  if (!result.ok) {
    console.error("[fetchEmails] Gmail label fetch failed:", result.error);
    return { unread: 0, total: 0, error: result.error };
  }

  return {
    unread: result.data.messagesUnread ?? 0,
    total: result.data.messagesTotal ?? 0,
  };
}

async function fetchGmailMessages(
  userId: string,
  limit: number,
  query: string
): Promise<EmailResult[]> {
  // Build Gmail search query
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=${encodeURIComponent(query)}`;
  const listResult = await googleFetch(listUrl, userId);

  if (!listResult.ok) {
    console.error("[fetchEmails] Gmail list failed:", listResult.error);
    return [];
  }

  const messages: any[] = listResult.data.messages ?? [];
  if (messages.length === 0) return [];

  // Fetch details for each message in parallel
  const emailDetails = await Promise.allSettled(
    messages.slice(0, limit).map(async (msg: any): Promise<EmailResult | null> => {
      const detailResult = await googleFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        userId
      );

      if (!detailResult.ok) return null;

      const detail = detailResult.data;
      const headers: any[] = detail.payload?.headers ?? [];
      const labelIds: string[] = detail.labelIds ?? [];

      return {
        id: msg.id,
        threadId: detail.threadId,
        subject: headers.find((h: any) => h.name === "Subject")?.value ?? "(No Subject)",
        from: headers.find((h: any) => h.name === "From")?.value ?? "Unknown",
        date: headers.find((h: any) => h.name === "Date")?.value ?? new Date(Number(detail.internalDate)).toISOString(),
        snippet: detail.snippet ?? "",
        isUnread: labelIds.includes("UNREAD"),
        provider: "google" as const,
      };
    })
  );

  return emailDetails
    .filter((r): r is PromiseFulfilledResult<EmailResult> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

// ── Microsoft Graph helpers ───────────────────────────────────────────────────

async function fetchOutlookMessages(
  userId: string,
  limit: number,
  query: string
): Promise<EmailResult[]> {
  const auth = await getConnectorByUserAndProvider({ userId, provider: "microsoft-365" });
  if (!auth) return [];

  const isUnreadQuery = query.includes("is:unread");
  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,bodyPreview,receivedDateTime,isRead`;
  if (isUnreadQuery) url += "&$filter=isRead eq false";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("[fetchEmails] Outlook fetch failed:", err);
    return [];
  }

  const data = await res.json();
  return (data.value ?? []).map((msg: any) => ({
    id: msg.id,
    subject: msg.subject ?? "(No Subject)",
    from: msg.from?.emailAddress?.name ?? msg.from?.emailAddress?.address ?? "Unknown",
    snippet: msg.bodyPreview ?? "",
    date: msg.receivedDateTime ?? "",
    isUnread: !msg.isRead,
    provider: "microsoft-365" as const,
  }));
}

// ── Main Tool ─────────────────────────────────────────────────────────────────

export const fetchEmails = ({ session }: { session: Session }) =>
  tool({
    description:
      "Fetch, search, or count the user's emails from connected accounts (Gmail or Outlook). " +
      "Use this for: checking unread count, reading recent emails, searching by sender/subject, or reviewing specific threads. " +
      "Always use this tool when the user asks anything about their inbox or emails.",
    inputSchema: z.object({
      provider: z
        .enum(["google", "microsoft-365", "all"])
        .optional()
        .default("all")
        .describe("Which email provider to check. Defaults to all connected providers."),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of emails to fetch (default 10, max 50)."),
      query: z
        .string()
        .optional()
        .default("is:unread")
        .describe(
          "Gmail-style search query. Use 'is:unread' for unread emails, 'from:someone@example.com' for emails from a person, 'subject:topic' for subject search. Defaults to 'is:unread'."
        ),
      countOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, only return the unread count without fetching full messages. Much faster."),
    }),
    execute: async ({ provider, limit, query, countOnly }) => {
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. Please sign in." };
      }

      const userId = session.user.id;
      const providersToCheck =
        provider === "all" ? ["google", "microsoft-365"] : [provider];

      const report: Record<string, any> = {};
      let totalUnread = 0;
      const allEmails: EmailResult[] = [];

      for (const p of providersToCheck) {
        if (p === "google") {
          // Always get the inbox label stats (fast, reliable)
          const counts = await getGmailUnreadCount(userId);

          if (!counts || counts.error) {
            report.google = {
              status: "error",
              message:
                `Could not access Gmail: ${counts?.error || "Unknown error"}. ` +
                "If this persists, please reconnect Google in the Connectors page.",
            };
            continue;
          }

          totalUnread += counts.unread;
          report.google = { unreadCount: counts.unread, totalInbox: counts.total };

          if (!countOnly) {
            const emails = await fetchGmailMessages(userId, limit, query ?? "is:unread");
            allEmails.push(...emails);
            report.google.emails = emails;
          }
        }

        if (p === "microsoft-365") {
          const auth = await getConnectorByUserAndProvider({ userId, provider: "microsoft-365" });
          if (!auth) {
            report["microsoft-365"] = { status: "not_connected" };
            continue;
          }

          if (!countOnly) {
            const emails = await fetchOutlookMessages(userId, limit, query ?? "is:unread");
            const unreadCount = emails.filter((e) => e.isUnread).length;
            totalUnread += unreadCount;
            allEmails.push(...emails);
            report["microsoft-365"] = { unreadCount, emails };
          }
        }
      }

      // Sort all emails newest-first
      allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (countOnly) {
        return {
          success: true,
          summary: `You have ${totalUnread} unread email${totalUnread === 1 ? "" : "s"}.`,
          totalUnread,
          perProvider: report,
        };
      }

      return {
        success: true,
        summary: `Found ${allEmails.length} email${allEmails.length === 1 ? "" : "s"} (${totalUnread} unread).`,
        totalUnread,
        emails: allEmails.slice(0, limit),
        perProvider: report,
      };
    },
  });
