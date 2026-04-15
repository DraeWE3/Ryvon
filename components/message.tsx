"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { memo, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();

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
          <img 
            src={session?.user?.image || "/img/pfp.png"} 
            alt="User" 
            onError={(e) => { e.currentTarget.src = "/img/pfp.png" }}
          />
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
                 let thinkingText = "Thinking...";
                 
                 // Dynamic detection
                 const toolCall = message.parts?.find(p => p.type?.startsWith('tool-'));
                 if (toolCall) {
                    const toolType = toolCall.type as string; // Typecast to string to avoid TS literal overlap warning
                    if (toolType === 'tool-createDocument') {
                        const kind = (toolCall as any).args?.kind;
                        if (kind === 'image') thinkingText = "Crafting Vision...";
                        else if (kind === 'code') thinkingText = "Engineering Solution...";
                        else thinkingText = "Drafting Document...";
                    } else if (toolType === 'tool-initiateCall') {
                        thinkingText = "Preparing Call...";
                    } else if (toolType === 'tool-listAssistants') {
                        thinkingText = "Scouting Agents...";
                    } else if (toolType === 'tool-manageWorkflows') {
                        thinkingText = "Architecting Workflow...";
                    } else if (toolType === 'tool-checkConnectors') {
                        thinkingText = "Polling Integrations...";
                    }
                 } else if (typeof part.text === 'string') {
                     // Heuristic fallback
                     const lowerText = part.text.toLowerCase();
                     if (lowerText.includes('image') || lowerText.includes('draw')) thinkingText = "Crafting Vision...";
                     else if (lowerText.includes('code') || lowerText.includes('python') || lowerText.includes('script')) thinkingText = "Engineering Solution...";
                     else if (lowerText.includes('call') || lowerText.includes('phone')) thinkingText = "Preparing Call...";
                 }

                 return (
                     <div key={key} className="mb-2">
                         <p className="p-bold mb-1">Thinking Process</p>
                         <MessageReasoning 
                            isLoading={isLoading} 
                            reasoning={part.text} 
                            thinkingText={thinkingText}
                         />
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

             if ((part.type as string) === "tool-listAssistants") {
                 return (
                    <Tool defaultOpen={true} key={part.toolCallId}>
                      <ToolHeader state={part.state} type="Agent Gallery" />
                      <ToolContent>
                        {part.state === "input-available" && <ToolInput input={part.input} />}
                        {part.state === "output-available" && part.output && typeof part.output === "object" && "assistants" in part.output && (
                            <div className="flex flex-col gap-4 p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(part.output.assistants as any[]).map((assistant: any) => (
                                        <div key={assistant.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#1EA7FF]/50 transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-[#1EA7FF]/10 flex items-center justify-center text-[#1EA7FF] group-hover:bg-[#1EA7FF]/20 transition-colors">
                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                        <SparklesIcon size={20} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-semibold text-sm">{assistant.name}</h4>
                                                    <p className="text-[10px] uppercase tracking-widest text-[#1EA7FF] font-medium opacity-80">{assistant.category}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{assistant.description}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 border-t border-white/5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Select an agent by name to proceed</p>
                                </div>
                            </div>
                        )}
                      </ToolContent>
                    </Tool>
                 );
             }

             if (["tool-initiateCall", "tool-manageWorkflows", "tool-checkConnectors"].includes(part.type as string)) {
                 const titleMap: Record<string, string> = {
                   "tool-initiateCall": "Voice Orchestration",
                   "tool-manageWorkflows": "Workflow Orchestration",
                   "tool-checkConnectors": "Connector Orchestration",
                 };
                 return (
                    <Tool defaultOpen={true} key={part.toolCallId}>
                      <ToolHeader state={part.state} type={titleMap[part.type as string]} />
                      <ToolContent>
                        {('state' in part && part.state === "input-available") && <ToolInput input={(part as any).input} />}
                        {('state' in part && part.state === "output-available") && (
                          <ToolOutput
                            errorText={(part as any).output && typeof (part as any).output === "object" && "error" in (part as any).output ? String((part as any).output.error) : undefined}
                            output={
                               (part as any).output && typeof (part as any).output === "object" && "success" in (part as any).output && (part as any).output.success === true ? (
                                   <div className="bg-[#121212] border border-gray-800 p-4 rounded-xl shadow-lg mt-2 font-mono text-sm overflow-hidden text-emerald-400">
                                       <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-widest">
                                           <div className="w-4 h-4 flex items-center justify-center text-emerald-400">
                                                <SparklesIcon size={16} />
                                           </div>
                                           Execution Success
                                       </div>
                                       <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                           {JSON.stringify((part as any).output, null, 2)}
                                       </pre>
                                   </div>
                               ) : (
                                   <pre className="text-xs">{JSON.stringify((part as any).output, null, 2)}</pre>
                               )
                            }
                          />
                        )}
                      </ToolContent>
                    </Tool>
                 );
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
