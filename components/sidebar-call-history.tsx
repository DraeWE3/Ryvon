"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { fetcher } from "@/lib/utils";
import { SidebarCallHistoryItem } from "./sidebar-call-history-item";

interface RecentCallLog {
  id: string;
  phoneNumber: string;
  status?: string;
  createdAt: string;
}

type GroupedLogs = {
  today: RecentCallLog[];
  yesterday: RecentCallLog[];
  lastWeek: RecentCallLog[];
  lastMonth: RecentCallLog[];
  older: RecentCallLog[];
};

const groupLogsByDate = (logs: RecentCallLog[]): GroupedLogs => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return logs.reduce(
    (groups, log) => {
      const logDate = new Date(log.createdAt);

      if (isToday(logDate)) {
        groups.today.push(log);
      } else if (isYesterday(logDate)) {
        groups.yesterday.push(log);
      } else if (logDate > oneWeekAgo) {
        groups.lastWeek.push(log);
      } else if (logDate > oneMonthAgo) {
        groups.lastMonth.push(log);
      } else {
        groups.older.push(log);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedLogs
  );
};

export function SidebarCallHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { data, mutate, isLoading } = useSWR<{ success: boolean, logs: RecentCallLog[] }>('/api/call/logs', fetcher);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/call/logs/${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting call log...",
      success: () => {
        mutate((currentData) => {
          if (currentData) {
            return {
              ...currentData,
              logs: currentData.logs.filter((log) => log.id !== deleteId),
            };
          }
        }, false);
        return "Call log deleted successfully";
      },
      error: "Failed to delete call log",
    });

    setShowDeleteDialog(false);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[44, 32, 28, 64, 52].map((item) => (
          <div className="h-4 bg-white/5 rounded animate-pulse" key={item} style={{ width: `${item}%` }} />
        ))}
      </div>
    );
  }

  const logs = data?.logs || [];

  if (logs.length === 0) {
    return (
      <div className="px-2 text-sm text-zinc-500">
        No recent call history
      </div>
    );
  }

  const groupedLogs = groupLogsByDate(logs);
  const groups = [
    { label: "Today", logs: groupedLogs.today },
    { label: "Yesterday", logs: groupedLogs.yesterday },
    { label: "Last 7 days", logs: groupedLogs.lastWeek },
    { label: "Last 30 days", logs: groupedLogs.lastMonth },
    { label: "Older", logs: groupedLogs.older },
  ];

  return (
    <>
      <div className="flex flex-col">
        {groups.map((group) => (
          group.logs.length > 0 && (
            <div key={group.label} className="mt-4 first:mt-0">
              {group.logs.map((log) => (
                <SidebarCallHistoryItem
                  log={log}
                  key={log.id}
                  onDelete={(id) => {
                    setDeleteId(id);
                    setShowDeleteDialog(true);
                  }}
                  setOpenMobile={setOpenMobile}
                />
              ))}
            </div>
          )
        ))}
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call Log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this call record from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
