import type { ComponentProps } from "react";

import { type SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();

  if (isMobile ? openMobile : open) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn("h-8 px-2 h-fit border-none bg-transparent hover:bg-white/5 block", className)}
          data-testid="sidebar-toggle-button"
          onClick={toggleSidebar}
          variant="outline"
        >
          <img src="/img-sidebar/sidebar-bar-open.svg" alt="Open Sidebar" className="w-6 h-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start" className="hidden md:block">
        Toggle Sidebar
      </TooltipContent>
    </Tooltip>
  );
}
