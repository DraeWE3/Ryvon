import { tool } from "ai";
import { z } from "zod";
import { getConnectorByUserAndProvider } from "@/lib/db/queries";
import type { Session } from "next-auth";
import { googleFetch, getValidGoogleToken } from "./google-token";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// ── Gmail send via Google API ─────────────────────────────────────────────────

/**
 * Encodes an email into RFC 2822 format and base64url-encodes it for the Gmail API.
 */
function buildGmailRaw(to: string, subject: string, body: string, from?: string, replyToMessageId?: string, attachmentsData?: {name: string, contentType: string, dataBase64: string}[]): { base64url: string, rawString: string } {
  const boundary = `----=_Part_${Date.now()}_Ryvon`;
  const lines: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (from) lines.push(`From: ${from}`);
  if (replyToMessageId) lines.push(`In-Reply-To: ${replyToMessageId}`, `References: ${replyToMessageId}`);

  if (!attachmentsData || attachmentsData.length === 0) {
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push("", body);
  } else {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push("");
    lines.push(body);
    lines.push("");

    for (const att of attachmentsData) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.name}"`);
      lines.push(`Content-Disposition: attachment; filename="${att.name}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push("");
      const b64 = att.dataBase64;
      for (let i = 0; i < b64.length; i += 76) {
        lines.push(b64.substring(i, i + 76));
      }
    }
    lines.push(`--${boundary}--`);
  }

  const raw = lines.join("\r\n");
  const base64url = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
    
  return { base64url, rawString: raw };
}

async function sendViaGmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  attachmentsData?: {name: string, contentType: string, dataBase64: string}[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const tokenResult = await getValidGoogleToken(userId);
  if (!tokenResult) {
    return { success: false, error: "Google account not connected. Please connect Gmail in Connectors." };
  }

  // Get sender email from auth record
  const auth = await getConnectorByUserAndProvider({ userId, provider: "google" });
  const senderEmail = auth?.accountEmail ?? undefined;

  const { base64url, rawString } = buildGmailRaw(to, subject, body, senderEmail, threadId, attachmentsData);
  
  let endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
  let fetchOptions: RequestInit;

  if (attachmentsData && attachmentsData.length > 0) {
    // Use uploadType=multipart for attachments to bypass the 5MB JSON payload limit
    endpoint = "https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=multipart";
    const multipartBoundary = `----=_Outer_Multipart_${Date.now()}_Ryvon`;
    
    const metadata = threadId ? JSON.stringify({ threadId }) : JSON.stringify({});
    const bodyParts = [
      `--${multipartBoundary}`,
      `Content-Type: application/json; charset=UTF-8`,
      ``,
      metadata,
      `--${multipartBoundary}`,
      `Content-Type: message/rfc822`,
      ``,
      rawString,
      `--${multipartBoundary}--`,
      ``
    ];
    
    fetchOptions = {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary="${multipartBoundary}"` },
      body: bodyParts.join("\r\n")
    };
  } else {
    // Standard JSON endpoint for plain text
    const payload: any = { raw: base64url };
    if (threadId) payload.threadId = threadId;
    
    fetchOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }

  const result = await googleFetch(endpoint, userId, fetchOptions);

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
  body: string,
  attachmentsData?: {name: string, contentType: string, dataBase64: string}[]
): Promise<{ success: boolean; error?: string }> {
  const auth = await getConnectorByUserAndProvider({ userId, provider: "microsoft-365" });
  if (!auth) {
    return { success: false, error: "Microsoft 365 account not connected." };
  }

  const payload: any = {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };

  if (attachmentsData && attachmentsData.length > 0) {
    payload.message.attachments = attachmentsData.map((att) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentType: att.contentType || "application/octet-stream",
      contentBytes: att.dataBase64
    }));
  }

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

// ── Attachment Processor ──────────────────────────────────────────────────────

async function processAttachments(attachments?: {url: string, name: string, contentType?: string}[]): Promise<{name: string, contentType: string, dataBase64: string}[]> {
  const processed: {name: string, contentType: string, dataBase64: string}[] = [];
  if (!attachments) return processed;
  
  for (const att of attachments) {
    if (!att.url) continue;
    try {
      const res = await fetch(att.url);
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      processed.push({
        name: att.name || 'attachment',
        contentType: att.contentType || res.headers.get('content-type') || 'application/octet-stream',
        dataBase64: buffer.toString('base64')
      });
    } catch (e) {
      console.error("Failed to fetch attachment:", e);
    }
  }
  return processed;
}

// ── Main Tool ─────────────────────────────────────────────────────────────────

export const sendEmailTool = ({ session, attachments = [] }: { session: Session, attachments?: {url: string, name: string, contentType?: string}[] }) =>
  tool({
    description:
      "Send an email on behalf of the user through their connected Gmail or Outlook account. " +
      "Use this tool when the user asks to send, reply to, or compose an email. " +
      "Always confirm the recipient, subject, and body with the user before sending unless they explicitly asked you to send it directly. " +
      "If the user asks to attach a file or image they just uploaded, set 'includeAttachments' to true.",
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
      includeAttachments: z
        .boolean()
        .optional()
        .describe("Set to true if you should attach the files or images the user just uploaded to this email."),
    }),
    execute: async ({ provider, to, subject, body, threadId, includeAttachments }) => {
      console.log(`[sendEmailTool] Start sending email to ${to} via ${provider}. includeAttachments:`, includeAttachments);
      console.log(`[sendEmailTool] Attachments array length:`, attachments?.length);
      
      if (!session?.user?.id) {
        console.error(`[sendEmailTool] Unauthorized: no session.`);
        return { success: false, error: "Unauthorized. Please sign in." };
      }

      const userId = session.user.id;
      let result: { success: boolean; messageId?: string; error?: string };
      
      let attachmentsData: any[] = [];
      try {
        if (includeAttachments && attachments && attachments.length > 0) {
          console.log(`[sendEmailTool] Processing attachments:`, attachments.map(a => a.url));
          attachmentsData = await processAttachments(attachments);
          console.log(`[sendEmailTool] Successfully processed ${attachmentsData.length} attachments.`);
        }
      } catch (err) {
        console.error(`[sendEmailTool] Error processing attachments:`, err);
      }

      if (provider === "google") {
        result = await sendViaGmail(userId, to, subject, body, threadId, attachmentsData);
      } else {
        result = await sendViaOutlook(userId, to, subject, body, attachmentsData);
      }
      
      console.log(`[sendEmailTool] Provider result:`, result);

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
