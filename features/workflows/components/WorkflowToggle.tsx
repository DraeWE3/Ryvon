"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function WorkflowToggle({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") return null;

  return (
    <button
      onClick={() => toggleSidebar()}
      className={cn(
        "sidebar-toggle-custom flex items-center justify-center p-1 rounded-md hover:bg-white/5 transition-colors mr-3",
        className
      )}
      title="Open Sidebar"
    >
      <img src="/img-sidebar/sidebar-bar-open.svg" alt="Toggle" className="w-6 h-6" />
    </button>
  );
}
