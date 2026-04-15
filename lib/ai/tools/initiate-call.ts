import { tool } from "ai";
import { z } from "zod";
import { saveCallLog } from "@/lib/db/queries";
import type { Session } from "next-auth";

type InitiateCallProps = {
  session: Session;
};

export const initiateCall = ({ session }: InitiateCallProps) =>
  tool({
    description:
      "Initiate an outgoing voice call using an AI voice agent. Phone numbers have two parts: a country code (region prefix, e.g. +234 for Nigeria, +1 for USA, +44 for UK) and the local number. You MUST have both parts. If the user only provides one, ask them to clarify the missing part before calling this tool.",
    inputSchema: z.object({
      countryCode: z
        .string()
        .describe(
          "The international country dialing code including the + sign (e.g. +234 for Nigeria, +1 for USA, +44 for UK). EXTRACT from the user message if present."
        ),
      localNumber: z
        .string()
        .describe(
          "The local phone number WITHOUT the country code. If the user provided a number like +234 070..., extract only the '70...' part (stripping the redundant leading 0)."
        ),
      assistantId: z
        .string()
        .optional()
        .describe(
          "The ID of the specific voice assistant to use. Only provide this if the user named a specific assistant (e.g., Rex, Nova)."
        ),
      customPrompt: z
        .string()
        .optional()
        .describe(
          "The goal or instructions for the call. EXTRACT this from the user's intent in the conversation (e.g. 'offer him a website')."
        ),
      language: z
        .enum(["en", "hi"])
        .optional()
        .describe("Language of the call. Default is english (en)"),
    }),
    execute: async ({ countryCode, localNumber, assistantId, customPrompt, language }) => {
      // Compose full E.164 phone number
      const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
      const local = localNumber.replace(/^0+/, ""); // strip leading zeros
      const phoneNumber = `${cc}${local}`;
      console.log('[initiateCall] Composed phone number:', phoneNumber);
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. User not logged in." };
      }

      if (!process.env.VAPI_PRIVATE_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
        return {
          success: false,
          error: "VAPI configuration missing on the server.",
        };
      }

      const targetAssistantId =
        assistantId || process.env.VAPI_ASSISTANT_ID;

      const assistantOverrides: any = {};

      if (customPrompt) {
        assistantOverrides.model = {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: customPrompt,
            },
          ],
        };
      }

      if (language === "hi") {
        const hindiInstruction =
          "CRITICAL INSTRUCTION: You MUST speak entirely in Hindi. Do not use English. Always reply in the Hindi language.";

        if (!assistantOverrides.model) {
          assistantOverrides.model = {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: hindiInstruction,
              },
            ],
          };
        } else if (
          assistantOverrides.model.messages &&
          assistantOverrides.model.messages.length > 0
        ) {
          assistantOverrides.model.messages[0].content += `\n\n${hindiInstruction}`;
        }
      }

      try {
        console.log('Initiating VAPI call with params:', {
          phoneNumber,
          assistantId: targetAssistantId,
          language,
          customPrompt: customPrompt ? 'EXISTS' : 'NONE'
        });

        const response = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
            customer: {
              number: phoneNumber,
            },
            assistantId: targetAssistantId,
            assistantOverrides,
          }),
        });

        console.log('VAPI Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('VAPI Error Response:', errorText);
          return { success: false, error: `VAPI Error: ${errorText}` };
        }

        const data = await response.json();
        console.log('VAPI Response Data:', data);

        // Save call log
        const [logRecord] = await saveCallLog({
          userId: session.user.id,
          phoneNumber: phoneNumber,
          assistantId: targetAssistantId,
          status: "queued",
          metadata: {
            language,
            customPrompt,
            callId: data.id,
          },
        });

        console.log('Call log saved with ID:', logRecord?.id);

        return {
          success: true,
          callId: data.id,
          logId: logRecord?.id,
          status: data.status,
          message: `Voice call successfully initiated to ${phoneNumber}. Status: ${data.status}`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        const cause = error instanceof Error && (error as any).cause;
        const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : null;
        console.error("[initiateCall] fetch error:", msg, cause);
        return {
          success: false,
          error: causeMsg ? `${msg}: ${causeMsg}` : msg,
        };
      }
    },
  });
