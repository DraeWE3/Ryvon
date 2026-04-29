"use client";

import { memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface RecentCallLog {
  id: string;
  phoneNumber: string;
  status?: string;
  createdAt: string;
}

const PureCallHistoryItem = ({
  log,
  onDelete,
  setOpenMobile,
}: {
  log: RecentCallLog;
  onDelete: (id: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = searchParams?.get("logId") === log.id;

  const handleClick = () => {
    setOpenMobile(false);
    router.push(`/call-agent?logId=${log.id}`);
  };

  return (
    <div className={`activity-item ${isActive ? 'active' : ''}`}>
      <button 
        onClick={handleClick}
        className="flex items-center gap-3 flex-1 overflow-hidden text-left"
      >
        <img src="/img-sidebar/right-arrow.svg" alt="" className="arrow-icon" />
        <span className="truncate">{log.phoneNumber}</span>
      </button>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <button className="options-trigger p-1 hover:bg-white/10 rounded">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(log.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const SidebarCallHistoryItem = memo(PureCallHistoryItem, (prevProps, nextProps) => {
  return prevProps.log.id === nextProps.log.id && prevProps.log.status === nextProps.log.status;
});
