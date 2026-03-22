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
        "absolute bottom-5 right-5 z-[500] flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 scroll-down-btn",
        className // Apply custom classes
      )}
      onClick={() => scrollToBottom()}
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="size-5 text-white" />
    </button>
  );
}
