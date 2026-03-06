import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { ArrowDownIcon } from "lucide-react";
import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";
import { PreviewMessage, ThinkingMessage } from "./message";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";

type MessagesProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
};

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  selectedModelId: _selectedModelId,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef, // Still attaching this ref, but if parent scrolls, it might not work for auto-scroll. 
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    status,
    messages,
  });

  useDataStream();

  return (
    // Messages container must handle scrolling for the hook to work
    <div 
      className="messages-container relative flex w-full flex-col items-center" 
      ref={messagesContainerRef}
    >
      {messages.map((message, index) => (
        <PreviewMessage
          chatId={chatId}
          isLoading={
            status === "streaming" && messages.length - 1 === index
          }
          isReadonly={isReadonly}
          key={message.id}
          message={message}
          regenerate={regenerate}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
          setMessages={setMessages}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
        />
      ))}

      {status === "submitted" && <ThinkingMessage />}

      <div
        className="min-h-[24px] min-w-[24px] shrink-0"
        ref={messagesEndRef}
      />

       <ScrollToBottomButton
        className="fixed bottom-36 right-8 transform translate-y-0 text-primary-foreground bg-primary hover:bg-primary/90 rounded-full shadow-lg"
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
    return true;
  }

  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }

  return false;
});
