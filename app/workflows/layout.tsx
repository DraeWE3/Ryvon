"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isCanvasPage = pathname === "/workflows/new";

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar user={session?.user} />
      <SidebarInset className={`relative min-h-screen overflow-hidden flex flex-col ${isCanvasPage ? 'bg-[#050812]' : 'bg-[#000]'}`}>
        {/* Layout Overlays — hidden on canvas builder */}
        {!isCanvasPage && (
          <>
            <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/80 to-black" />
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
          </>
        )}
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
