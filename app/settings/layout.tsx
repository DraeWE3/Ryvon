import { cookies } from "next/headers";
import { Suspense } from "react";
import { GeneralSidebar } from "@/components/general-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "../(auth)/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <SidebarWrapper>{children}</SidebarWrapper>
    </Suspense>
  );
}

async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <GeneralSidebar user={session?.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
