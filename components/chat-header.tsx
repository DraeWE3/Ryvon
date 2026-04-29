"use client";

import { memo } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { cn } from "@/lib/utils";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  className,
  style,
}: {
  chatId: string;
  selectedVisibilityType: any;
  isReadonly: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <header className={cn("chat-top", className)} style={style}>
      <div className="flex items-center gap-3">
        <SidebarToggle className="sidebar-toggle-external text-white" />
      </div>

      <div className="flex items-center gap-2">
        {/* RyvonAI branding - Right side only */}
        <div className="btn2 btn premium-btn">
          <p>RyvonAI v1.0</p>
        </div>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
