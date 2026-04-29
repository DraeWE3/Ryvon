import { tool } from "ai";
import { z } from "zod";
import { getConnectorByUserAndProvider } from "@/lib/db/queries";
import type { Session } from "next-auth";
import { googleFetch, getValidGoogleToken } from "./google-token";

// ── Gmail send via Google API ─────────────────────────────────────────────────

/**
 * Encodes an email into RFC 2822 format and base64url-encodes it for the Gmail API.
 */
function buildGmailRaw(to: string, subject: string, body: string, from?: string, replyToMessageId?: string): string {
  const lines: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
  ];

  if (from) lines.push(`From: ${from}`);
  if (replyToMessageId) lines.push(`In-Reply-To: ${replyToMessageId}`, `References: ${replyToMessageId}`);

  lines.push("", body);

  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendViaGmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const tokenResult = await getValidGoogleToken(userId);
  if (!tokenResult) {
    return { success: false, error: "Google account not connected. Please connect Gmail in Connectors." };
  }

  // Get sender email from auth record
  const auth = await getConnectorByUserAndProvider({ userId, provider: "google" });
  const senderEmail = auth?.accountEmail ?? undefined;

  const rawEmail = buildGmailRaw(to, subject, body, senderEmail);
  const payload: any = { raw: rawEmail };
  if (threadId) payload.threadId = threadId;

  const result = await googleFetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    userId,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!result.ok) {
    return { success: false, error: result.error ?? "Gmail API returned an error." };
  }

  return { success: true, messageId: result.data.id };
}

// ── Outlook send via Microsoft Graph ─────────────────────────────────────────

async function sendViaOutlook(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getConnectorByUserAndProvider({ userId, provider: "microsoft-365" });
  if (!auth) {
    return { success: false, error: "Microsoft 365 account not connected." };
  }

  const payload = {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err?.error?.message ?? `Outlook API error: HTTP ${res.status}` };
  }

  return { success: true };
}

// ── Main Tool ─────────────────────────────────────────────────────────────────

export const sendEmailTool = ({ session }: { session: Session }) =>
  tool({
    description:
      "Send an email on behalf of the user through their connected Gmail or Outlook account. " +
      "Use this tool when the user asks to send, reply to, or compose an email. " +
      "Always confirm the recipient, subject, and body with the user before sending unless they explicitly asked you to send it directly.",
    inputSchema: z.object({
      provider: z
        .enum(["google", "microsoft-365"])
        .optional()
        .default("google")
        .describe("Which email provider to send through. Defaults to Google/Gmail."),
      to: z
        .string()
        .email()
        .describe("The recipient's full email address (e.g., john@example.com)."),
      subject: z
        .string()
        .min(1)
        .describe("The email subject line."),
      body: z
        .string()
        .min(1)
        .describe("The full body of the email in plain text."),
      threadId: z
        .string()
        .optional()
        .describe("Optional Gmail thread ID to reply within the same thread."),
    }),
    execute: async ({ provider, to, subject, body, threadId }) => {
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. Please sign in." };
      }

      const userId = session.user.id;
      let result: { success: boolean; messageId?: string; error?: string };

      if (provider === "google") {
        result = await sendViaGmail(userId, to, subject, body, threadId);
      } else {
        result = await sendViaOutlook(userId, to, subject, body);
      }

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          hint:
            result.error?.includes("not connected")
              ? "Go to Workflows → Connectors and connect your email account."
              : "Please try again or check your account connection.",
        };
      }

      return {
        success: true,
        message: `Email successfully sent to ${to} via ${provider === "google" ? "Gmail" : "Outlook"}.`,
        messageId: result.messageId,
      };
    },
  });
