import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  callLogs,
  type CallLog,
  workflow,
  type Workflow,
  workflowRun,
  type WorkflowRun,
  connectorAuth,
  type ConnectorAuth,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function saveCallLog(params: {
  userId: string;
  phoneNumber: string;
  assistantId?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    return await db.insert(callLogs).values(params).returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save call log");
  }
}

export async function getCallLogsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(desc(callLogs.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get call logs by user id"
    );
  }
}

export async function updateCallLogStatus({
  id,
  status,
  transcript,
  summary,
  duration,
  recordingUrl,
}: {
  id: string;
  status?: string;
  transcript?: string;
  summary?: string;
  duration?: string;
  recordingUrl?: string;
}) {
  try {
    return await db
      .update(callLogs)
      .set({ status, transcript, summary, duration, recordingUrl })
      .where(eq(callLogs.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update call log");
  }
}

export async function deleteCallLog({ id }: { id: string }) {
  try {
    return await db.delete(callLogs).where(eq(callLogs.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete call log");
  }
}

// ==================== Workflows ====================

export async function getWorkflowsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(workflow)
      .where(eq(workflow.userId, userId))
      .orderBy(desc(workflow.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get workflows by user id"
    );
  }
}

export async function getActiveWorkflowsByTriggerType({
  triggerType,
}: {
  triggerType: "cron" | "event" | "manual";
}) {
  try {
    return await db
      .select()
      .from(workflow)
      .where(and(eq(workflow.triggerType, triggerType), eq(workflow.active, true)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get active workflows by trigger type"
    );
  }
}

export async function getActiveWorkflowsByEventValue({
  eventValue,
}: {
  eventValue: string;
}) {
  try {
    return await db
      .select()
      .from(workflow)
      .where(
        and(
          eq(workflow.triggerType, "event"),
          eq(workflow.triggerValue, eventValue),
          eq(workflow.active, true)
        )
      );
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get workflows by event value"
    );
  }
}

export async function getWorkflowById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select()
      .from(workflow)
      .where(eq(workflow.id, id));
    return result ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get workflow by id"
    );
  }
}

export async function createWorkflow(data: {
  userId: string;
  name: string;
  triggerType: "cron" | "event" | "manual";
  triggerValue: string;
  triggerDescription: string;
  category?: string;
  icon?: string;
  steps: any[];
  active?: boolean;
}) {
  try {
    const [result] = await db
      .insert(workflow)
      .values({
        userId: data.userId,
        name: data.name,
        triggerType: data.triggerType,
        triggerValue: data.triggerValue,
        triggerDescription: data.triggerDescription,
        category: data.category ?? "General",
        icon: data.icon ?? "Workflow",
        steps: data.steps,
        active: data.active ?? true,
      })
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create workflow");
  }
}

export async function updateWorkflow({
  id,
  data,
}: {
  id: string;
  data: Partial<{
    name: string;
    triggerType: string;
    triggerValue: string;
    triggerDescription: string;
    steps: any[];
    active: boolean;
  }>;
}) {
  try {
    const [result] = await db
      .update(workflow)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workflow.id, id))
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update workflow");
  }
}

export async function deleteWorkflowById({ id }: { id: string }) {
  try {
    // Delete runs first (FK constraint)
    await db.delete(workflowRun).where(eq(workflowRun.workflowId, id));
    const [result] = await db
      .delete(workflow)
      .where(eq(workflow.id, id))
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete workflow");
  }
}

// ==================== Workflow Runs ====================

export async function getRunsByWorkflowId({
  workflowId,
  limit = 20,
}: {
  workflowId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(workflowRun)
      .where(eq(workflowRun.workflowId, workflowId))
      .orderBy(desc(workflowRun.startedAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get runs by workflow id"
    );
  }
}

export async function createRun(data: {
  workflowId: string;
  userId: string;
  triggeredBy?: string;
}) {
  try {
    const [result] = await db
      .insert(workflowRun)
      .values({
        workflowId: data.workflowId,
        userId: data.userId,
        triggeredBy: data.triggeredBy ?? "manual",
        status: "pending",
      })
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create run");
  }
}

export async function getRunById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select()
      .from(workflowRun)
      .where(eq(workflowRun.id, id));
    return result ?? null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get run by id");
  }
}

export async function updateRun({
  id,
  data,
}: {
  id: string;
  data: Partial<{
    status: string;
    completedAt: Date;
    stepResults: any[];
    error: string;
  }>;
}) {
  try {
    const [result] = await db
      .update(workflowRun)
      .set(data)
      .where(eq(workflowRun.id, id))
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update run");
  }
}

export async function getWorkflowStats({ userId }: { userId: string }) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [runsToday] = await db
      .select({ count: count(workflowRun.id) })
      .from(workflowRun)
      .where(
        and(
          eq(workflowRun.userId, userId),
          gte(workflowRun.startedAt, todayStart)
        )
      );

    const [totalRuns] = await db
      .select({ count: count(workflowRun.id) })
      .from(workflowRun)
      .where(eq(workflowRun.userId, userId));

    return {
      runs_today: runsToday?.count ?? 0,
      total_runs: totalRuns?.count ?? 0,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get workflow stats"
    );
  }
}

// ==================== Connector Auth ====================

export async function getConnectorsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(connectorAuth)
      .where(eq(connectorAuth.userId, userId))
      .orderBy(desc(connectorAuth.connectedAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get connectors by user id"
    );
  }
}

export async function getConnectorByUserAndProvider({
  userId,
  provider,
}: {
  userId: string;
  provider: string;
}) {
  try {
    const [result] = await db
      .select()
      .from(connectorAuth)
      .where(
        and(
          eq(connectorAuth.userId, userId),
          eq(connectorAuth.provider, provider)
        )
      );
    return result ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get connector by provider"
    );
  }
}

export async function upsertConnectorAuth(data: {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: Date;
  accountEmail?: string;
  accountName?: string;
  metadata?: any;
}) {
  try {
    // Check if exists
    const existing = await getConnectorByUserAndProvider({
      userId: data.userId,
      provider: data.provider,
    });

    if (existing) {
      const [result] = await db
        .update(connectorAuth)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? existing.refreshToken,
          tokenType: data.tokenType ?? existing.tokenType,
          scope: data.scope ?? existing.scope,
          expiresAt: data.expiresAt ?? existing.expiresAt,
          accountEmail: data.accountEmail ?? existing.accountEmail,
          accountName: data.accountName ?? existing.accountName,
          metadata: data.metadata ?? existing.metadata,
          updatedAt: new Date(),
        })
        .where(eq(connectorAuth.id, existing.id))
        .returning();
      return result;
    }

    const [result] = await db
      .insert(connectorAuth)
      .values({
        userId: data.userId,
        provider: data.provider,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType || "Bearer",
        scope: data.scope,
        expiresAt: data.expiresAt,
        accountEmail: data.accountEmail,
        accountName: data.accountName,
        metadata: data.metadata,
      })
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to upsert connector auth"
    );
  }
}

export async function deleteConnectorAuth({
  userId,
  provider,
}: {
  userId: string;
  provider: string;
}) {
  try {
    const [result] = await db
      .delete(connectorAuth)
      .where(
        and(
          eq(connectorAuth.userId, userId),
          eq(connectorAuth.provider, provider)
        )
      )
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete connector auth"
    );
  }
}
