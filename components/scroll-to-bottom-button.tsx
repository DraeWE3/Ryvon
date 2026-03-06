"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  className?: string; // Allow custom classes
}

export function ScrollToBottomButton({
  isAtBottom,
  scrollToBottom,
  className,
}: ScrollToBottomButtonProps) {
  if (isAtBottom) return null;

  return (
    <button
      className={cn(
        "absolute bottom-5 right-5 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-sm transition-opacity duration-300 hover:bg-muted",
        className // Apply custom classes
      )}
      onClick={() => scrollToBottom()}
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
