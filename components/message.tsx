"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { memo, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  // User Message
  if (message.role === "user") {
    return (
      <div className="user-input-message w-full mb-4">
        <div className="pfp">
          <p className="username">You</p>
          <img src="/img/pfp.png" alt="User" />
        </div>
        
        {attachmentsFromMessage.length > 0 && (
          <div className="flex flex-row justify-end gap-2 mb-2 w-full pr-12">
            {attachmentsFromMessage.map((attachment) => (
              <PreviewAttachment
                attachment={{
                  name: attachment.filename ?? "file",
                  contentType: attachment.mediaType,
                  url: attachment.url,
                }}
                key={attachment.url}
              />
            ))}
          </div>
        )}

        <div className="message min-w-[20%] max-w-[80%]">
             {/* Using existing logic for content rendering */}
             {message.parts?.map((part, index) => {
                 if (part.type === "text") {
                     return (
                         <MessageContent key={index} className="text-white">
                             <Response>{sanitizeText(part.text)}</Response>
                         </MessageContent>
                     );
                 }
                 return null;
             })}
        </div>
        
        {/* Actions for User (Edit) */}
        {!isReadonly && mode === "edit" && (
             <MessageEditor
                key={message.id}
                message={message}
                regenerate={regenerate}
                setMessages={setMessages}
                setMode={setMode}
              />
        )}
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="chat-content w-full mb-6">
      <div className="title mb-2">
        <img src="/img/ask.svg" alt="Ryvon" />
        <p>Ryvon</p>
      </div>

      <div className="flex flex-col gap-2 w-full">
         {message.parts?.map((part, index) => {
             const key = `message-${message.id}-part-${index}`;
             if (part.type === "reasoning" && part.text?.trim().length > 0) {
                 return (
                     <div key={key} className="mb-2">
                         <p className="p-bold mb-1">Thinking Process</p>
                         <MessageReasoning isLoading={isLoading} reasoning={part.text} />
                     </div>
                 );
             }

             if (part.type === "text") {
                 return (
                     <MessageContent key={key} className="p-norm text-white">
                         <Response>{sanitizeText(part.text)}</Response>
                     </MessageContent>
                 );
             }

             if (part.type === "tool-getWeather") {
                 // Keep tool logic
                 return (
                    <Tool defaultOpen={true} key={part.toolCallId}>
                      <ToolHeader state={part.state} type="tool-getWeather" />
                      <ToolContent>
                        {part.state === "input-available" && <ToolInput input={part.input} />}
                        {part.state === "output-available" && (
                          <ToolOutput
                            errorText={undefined}
                            output={<Weather weatherAtLocation={part.output} />}
                          />
                        )}
                      </ToolContent>
                    </Tool>
                 );
             }
             
             // Handle other tools similarly (CreateDocument, etc)
             if (part.type === "tool-createDocument" || part.type === "tool-updateDocument" || part.type === "tool-requestSuggestions") {
                  if (part.type === "tool-createDocument" || part.type === "tool-updateDocument") {
                      const output = part.output;
                       if (output && "error" in output) {
                         return (
                           <div key={part.toolCallId} className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500">
                             Error: {String(output.error)}
                           </div>
                         );
                       }
                      return (
                         <DocumentPreview
                           key={part.toolCallId}
                           isReadonly={isReadonly}
                           result={output}
                           args={part.type === "tool-updateDocument" ? { ...output, isUpdate: true } : undefined}
                         />
                      );
                  }
                  if (part.type === "tool-requestSuggestions") {
                       return (
                        <Tool defaultOpen={true} key={part.toolCallId}>
                          <ToolHeader state={part.state} type="tool-requestSuggestions" />
                          <ToolContent>
                            {part.state === "input-available" &&  <ToolInput input={part.input} />}
                            {part.state === "output-available" && (
                              <ToolOutput
                                errorText={undefined}
                                output={"error" in part.output ? (
                                    <div className="rounded border p-2 text-red-500">Error: {String(part.output.error)}</div>
                                ) : (
                                    <DocumentToolResult isReadonly={isReadonly} result={part.output} type="request-suggestions" />
                                )}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                       )
                  }
             }

             return null;
         })}
      </div>

      {!isReadonly && (
        <div className="mt-2">
            <MessageActions
            chatId={chatId}
            isLoading={isLoading}
            key={`action-${message.id}`}
            message={message}
            setMode={setMode}
            vote={vote}
            />
        </div>
      )}
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    return true;
  }
);

export const ThinkingMessage = () => {
  return (
    <div className="chat-content w-full mb-6">
       <div className="title mb-2">
        <img src="/img/ask.svg" alt="Ryvon" />
        <p>Ryvon</p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground p-norm">
        <span>Thinking</span>
        <span className="animate-bounce">.</span>
        <span className="animate-bounce delay-100">.</span>
        <span className="animate-bounce delay-200">.</span>
      </div>
    </div>
  );
};
