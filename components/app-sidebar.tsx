"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/images/logo.png";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { WorkflowSidebarList } from "@/features/workflows/components/WorkflowSidebarList";
import { useWorkflowUIStore } from "@/features/workflows/hooks/useCreateWorkflow";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { containerSequence } from "@/lib/animations/timelines";
import { useRef } from "react";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import { SidebarCallHistory } from "@/components/sidebar-call-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import { ComingSoonModal } from "@/components/coming-soon-modal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { setCreateDrawerOpen } = useWorkflowUIStore();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (sidebarContentRef.current) {
      gsap.from(sidebarContentRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      });
      containerSequence(sidebarContentRef.current, ".sidebar-nav-item, .new-chat-btn-custom, .sidebar-section-label");
    }
  }, { scope: sidebarContentRef });

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0 border-none">
        <div className="sidebar-container">
          <div className="sidebar-header-custom">
            <Link href="/" className="flex items-center gap-2">
              <img src="/img-sidebar/side-logo.svg" alt="Ryvon AI" className="sidebar-logo-img" />
            </Link>
            <div className="sidebar-toggle-custom" onClick={() => toggleSidebar()}>
              <img src="/img-sidebar/sidebar-bar-open.svg" alt="Toggle" className="w-6 h-6" />
            </div>
          </div>

          <div ref={sidebarContentRef} className="sidebar-content-scrollable">
            <button 
              className="new-chat-btn-custom w-full cursor-pointer"
              onClick={() => {
                setOpenMobile(false);
                if (pathname?.startsWith("/workflows")) {
                  setCreateDrawerOpen(true);
                } else {
                  router.push(pathname === "/call-agent" ? "/call-agent" : pathname?.startsWith("/tts") ? "/tts" : "/");
                  router.refresh();
                }
              }}
            >
              <img 
                src={pathname?.startsWith("/workflows") ? "/img-sidebar/automation.svg" : pathname === "/call-agent" ? "/img-sidebar/call-icon.svg" : pathname?.startsWith("/tts") ? "/img-sidebar/tts-icon.svg" : "/img-sidebar/new-chat.svg"} 
                alt="" 
                className={pathname === "/call-agent" ? "sidebar-nav-icon2" : pathname?.startsWith("/tts") ? "sidebar-nav-icon1" : "w-5 h-5"} 
              />
              <span>{pathname?.startsWith("/workflows") ? "New Workflow" : pathname === "/call-agent" ? "New Call" : pathname?.startsWith("/tts") ? "New Script" : "New Chat"}</span>
            </button>

            <div className="sidebar-section">
              <h3 className="sidebar-section-label">Features</h3>
              <div className="flex flex-col gap-1">
                <Link href="/" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-nav-icon text-[rgba(255,255,255,0.60)]">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Home</span>
                </Link>
                <Link href="/tts" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <img src="/img-sidebar/tts-icon.svg" alt="" className="sidebar-nav-icon sidebar-nav-icon1" />
                  <span>Text-to-Speech</span>
                </Link>
                <Link href="/call-agent" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <img src="/img-sidebar/call-icon.svg" alt="" className="sidebar-nav-icon sidebar-nav-icon2" />
                  <span>Voice call</span>
                </Link>
                <Link 
                  href="/workflows" 
                  className="sidebar-nav-item" 
                  onClick={() => setOpenMobile(false)}
                >
                  <img src="/img-sidebar/automation.svg" alt="" className="sidebar-nav-icon" />
                  <span className={pathname?.startsWith('/workflows') ? "text-[#ffffff]" : ""}>Workflows</span>
                </Link>

              </div>
            </div>

            {pathname?.startsWith("/workflows") ? (
              <div className="flex-1 mt-4 border-t border-[rgba(255,255,255,0.06)] pt-2 overflow-hidden flex flex-col h-full">
                <WorkflowSidebarList userId={user?.id} />
              </div>
            ) : pathname?.startsWith("/call-agent") ? (
              <div className="recent-activity-section">
                <h3 className="sidebar-section-label">Call History</h3>
                <SidebarCallHistory user={user} />
              </div>
            ) : (
              <div className="recent-activity-section">
                <h3 className="sidebar-section-label">Recent Activity</h3>
                <SidebarHistory user={user} />
              </div>
            )}
          </div>

          <div className="sidebar-footer-card-container">
            <div className="sidebar-footer-card">
              <div className="footer-nav-item" onClick={() => {}}>
                <img src="/img-sidebar/theme-switch.svg" alt="" className="footer-nav-icon" />
                <span>Theme Switcher</span>
              </div>
              <div className="footer-nav-item" onClick={() => setShowSupportModal(true)}>
                <img src="/img-sidebar/support.svg" alt="" className="footer-nav-icon" />
                <span>Support</span>
              </div>
              {user && (
                <Link href="/settings" className="footer-nav-item">
                  <img src="/img-sidebar/account.svg" alt="" className="footer-nav-icon" />
                  <span>Account</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComingSoonModal 
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        title="Support Feature Coming Soon"
        description="We're working on bringing advanced support capabilities to Ryvon. Enable real-world help powered by AI."
        featureName="Support"
        iconPath="/images/support-cs.svg"
      />
    </>
  );
}