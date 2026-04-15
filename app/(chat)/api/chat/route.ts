// app/api/chat/route.ts
// This keeps Vercel AI SDK but uses OpenAI as the provider
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { initiateCall } from "@/lib/ai/tools/initiate-call";
import { listAssistants } from "@/lib/ai/tools/list-assistants";
import { manageWorkflows } from "@/lib/ai/tools/manage-workflows";
import { checkConnectors } from "@/lib/ai/tools/check-connectors";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

// Create OpenAI provider using Vercel AI SDK - Force direct connection
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  fetch: (url, init) => {
    // Force URL override to prevent gateway hijacking
    if (url.toString().includes('ai-gateway.vercel.sh')) {
      url = 'https://api.openai.com/v1/chat/completions';
    }
    return fetch(url, init);
  },
});

// Model mapping
const getOpenAIModel = (chatModel: ChatModel["id"]) => {
  switch (chatModel) {
    case "chat-model":
      return openai("gpt-4o");
    case "chat-model-reasoning":
      return openai("o1-preview");
    default:
      return openai("gpt-4o");
  }
};

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return;
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  console.log('[CHAT API] POST request received');
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log('[CHAT API] Parsed JSON, validating schema...');
    requestBody = postRequestBodySchema.parse(json);
    console.log('[CHAT API] Schema validation passed for chat:', json.id);
  } catch (error) {
    console.error('[CHAT API] Request validation failed:', error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    }

    // Process attachments to enable vision and text context
    const processedMessages = await Promise.all([...convertToUIMessages(messagesFromDb), message].map(async (msg) => {
      if (msg.role !== 'user') return msg;
      
      const newParts = await Promise.all(msg.parts.map(async (part: any) => {
        if (part.type === 'file') {
          // If it's an image, convert to image part for vision
          if (part.mediaType.startsWith('image/')) {
            try {
              console.log('[CHAT API] Processing image part:', part.name, part.mediaType);
              const response = await fetch(part.url);
              const buffer = await response.arrayBuffer();
              
              const imagePart = {
                type: 'image',
                image: new Uint8Array(buffer),
                mimeType: part.mediaType,
              };

              console.log('[CHAT API] Created image part successfully');
              return imagePart;
            } catch (error) {
              console.error('[CHAT API] Failed to fetch image for vision:', error);
              return part;
            }
          }
          
          // If it's text/csv, extract content for context
          const isTextFile = part.mediaType.startsWith('text/') || 
                            part.mediaType === 'application/csv' || 
                            part.mediaType === 'text/csv' ||
                            part.name.endsWith('.csv') ||
                            part.name.endsWith('.txt');

          if (isTextFile) {
             try {
              const response = await fetch(part.url);
              const content = await response.text();
              return {
                type: 'text',
                text: `\n[FILE ATTACHMENT: ${part.name}]\n--- CONTENT START ---\n${content}\n--- CONTENT END ---\n`,
              };
            } catch (error) {
              console.error('Failed to fetch file for context:', error);
              return part;
            }
          }
        }
        return part;
      }));

      return {
        ...msg,
        parts: newParts,
      };
    }));

    const uiMessages = processedMessages;

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Extract attachments from parts for database persistence
    const attachments = message.parts
      .filter((part) => part.type === "file")
      .map((part) => ({
        url: part.url,
        name: (part as any).name ?? 'attachment',
        contentType: part.mediaType,
      }));

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: attachments,
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    console.log('[CHAT API] Starting stream with model:', selectedChatModel);

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log('[CHAT API] Execute callback started');
        
        // MANUALLY CONSTRUCT CORE MESSAGES FOR GPT-4o
        const modelMessages = uiMessages.map((msg: any) => {
          const { role, parts } = msg;
          const content = msg.content; // may not exist on the type but could be present at runtime

          // If there are no specialized parts, return a simple text message
          if (!parts || parts.length === 0) {
            return {
              role: role as 'user' | 'assistant' | 'system',
              content: typeof content === 'string' ? content : '',
            };
          }

          // For messages with parts (like vision or documents), create a content array
          const contentParts: any[] = [];

          // Add processed parts (images, tool extractions, etc.)
          parts.forEach((part: any) => {
            if (part.type === 'text') {
              contentParts.push({ type: 'text', text: part.text });
            } else if (part.type === 'image') {
              contentParts.push({
                type: 'image',
                image: part.image,
                mimeType: part.mimeType,
              });
            }
          });

          // Fallback: if no content parts were extracted, use raw content
          if (contentParts.length === 0 && content) {
            return {
              role: role as 'user' | 'assistant' | 'system',
              content: typeof content === 'string' ? content : JSON.stringify(content),
            };
          }

          return {
            role: role as 'user' | 'assistant' | 'system',
            content: contentParts.length > 0 ? contentParts : '',
          };
        });
        
        // SAFE DIAGNOSTIC LOGGING
        try {
          console.log('[CHAT API] FINAL CORE MESSAGES:');
          modelMessages.forEach((m, i) => {
            const partInfo = Array.isArray(m.content) 
              ? m.content.map(p => `[${p.type}]`).join(', ')
              : 'simple text';
            console.log(`  Msg ${i} (${m.role}): ${partInfo}`);
          });
        } catch (logError) {
          console.error('[CHAT API] Logging failed:', logError);
        }

        const result = streamText({
          model: getOpenAIModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: modelMessages as any,
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "initiateCall",
                  "listAssistants",
                  "manageWorkflows",
                  "checkConnectors",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            initiateCall: initiateCall({ session }),
            listAssistants: listAssistants(),
            manageWorkflows: manageWorkflows({ session }),
            checkConnectors: checkConnectors({ session }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            console.log('[CHAT API] streamText onFinish fired');
            try {
              const providers = await getTokenlensCatalog();
              const modelId = getOpenAIModel(selectedChatModel).modelId;
              
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => {
            const attachments = currentMessage.parts
              .filter((part) => part.type === "file")
              .map((part) => ({
                url: part.url,
                name: (part as any).name ?? 'attachment',
                contentType: part.mediaType,
              }));

            return {
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: attachments,
              chatId: id,
            };
          }),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: (error) => {
        console.error('[CHAT API] Stream error:', error);
        return "Oops, an error occurred!";
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for OpenAI API errors
    if (error instanceof Error) {
      if (error.message?.includes("API key")) {
        console.error("OpenAI API key error:", error);
        return new ChatSDKError("unauthorized:chat").toResponse();
      }
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}