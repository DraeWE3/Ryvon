"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="chat-top">
      <div className="flex items-center gap-3">
        <SidebarToggle className="sidebar-toggle-external text-white" />
        <div className="btn2 btn cursor-pointer desktop-only">
          <p>RyvonAI v1.0</p>
          <img src="/img/down.svg" alt="" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="right-btncon desktop-only">
          <div className="btn2 btn cursor-pointer">
            <p>configuration</p>
            <img src="/img/setting.svg" alt="" />
          </div>
          <div className="btn2 btn cursor-pointer">
            <p>Export</p>
            <img src="/img/export.svg" alt="" />
          </div>
        </div>

        <div className="mobile-menu-btn" onClick={() => setIsMenuOpen(true)}>
          <Menu color="white" />
        </div>
      </div>

      {/* Mobile Side Menu Overlay */}
      <div 
        className={cn("side-menu-overlay", isMenuOpen ? "active" : "")} 
        onClick={() => setIsMenuOpen(false)} 
      />

      {/* Mobile Side Menu */}
      <div className={`side-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="menu-header">
          <div className="btn2 btn">
            <p>RyvonAI v1.0</p>
            <img src="/img/down.svg" alt="" />
          </div>
          <div onClick={() => setIsMenuOpen(false)} className="cursor-pointer p-2">
            <X color="white" size={24} />
          </div>
        </div>
        <div className="menu-items">
          <div className="btn2 btn cursor-pointer" onClick={() => setIsMenuOpen(false)}>
            <p>configuration</p>
            <img src="/img/setting.svg" alt="" />
          </div>
          <div className="btn2 btn cursor-pointer" onClick={() => setIsMenuOpen(false)}>
            <p>Export</p>
            <img src="/img/export.svg" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
