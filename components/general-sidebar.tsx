"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import {
  Sidebar,
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

export function GeneralSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

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

          <div className="sidebar-content-scrollable">
            <Link 
              href="/" 
              className="new-chat-btn-custom"
              onClick={() => {
                setOpenMobile(false);
                router.refresh();
              }}
            >
              <img src="/img-sidebar/new-chat.svg" alt="" className="w-5 h-5" />
              <span>New Chat</span>
            </Link>

            <div className="sidebar-section">
              <h3 className="sidebar-section-label">Features</h3>
              <div className="flex flex-col gap-1">
                <Link href="/tts" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <img src="/img-sidebar/tts-icon.svg" alt="" className="sidebar-nav-icon sidebar-nav-icon1" />
                  <span>Text-to-Speech</span>
                </Link>
                <Link href="/call-agent" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <img src="/img-sidebar/call-icon.svg" alt="" className="sidebar-nav-icon sidebar-nav-icon2" />
                  <span>Voice call</span>
                </Link>
                <Link href="/automation" className="sidebar-nav-item" onClick={() => setOpenMobile(false)}>
                  <img src="/img-sidebar/automation.svg" alt="" className="sidebar-nav-icon" />
                  <span>Workflow Automation</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="sidebar-footer-card-container">
            <div className="sidebar-footer-card">
              <div className="footer-nav-item" onClick={() => {}}>
                <img src="/img-sidebar/theme-switch.svg" alt="" className="footer-nav-icon" />
                <span>Theme Switcher</span>
              </div>
              <div className="footer-nav-item" onClick={() => {}}>
                <img src="/img-sidebar/support.svg" alt="" className="footer-nav-icon" />
                <span>Support</span>
              </div>
              {user && (
                <div className="footer-nav-item" onClick={() => {}}>
                  <img src="/img-sidebar/account.svg" alt="" className="footer-nav-icon" />
                  <span>Account</span>
                </div>
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
    </>
  );
}
