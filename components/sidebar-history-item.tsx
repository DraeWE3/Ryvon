import Link from "next/link";
import { memo } from "react";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Chat } from "@/lib/db/schema";
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  ShareIcon,
  TrashIcon,
} from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
  });

  return (
    <div className={`activity-item ${isActive ? 'active' : ''}`}>
      <Link 
        href={`/chat/${chat.id}`} 
        onClick={() => setOpenMobile(false)}
        className="flex items-center gap-3 flex-1 overflow-hidden"
      >
        <img src="/img-sidebar/right-arrow.svg" alt="" className="arrow-icon" />
        <span>{chat.title}</span>
      </Link>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <button className="options-trigger p-1 hover:bg-white/10 rounded">
            <MoreHorizontalIcon size={14} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="end" 
          side="bottom"
          className="bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 min-w-[180px] shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-motive text-white"
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-3 hover:bg-white/10 focus:bg-white/10 rounded-xl px-3 py-2.5 text-[13.5px] text-white/90 data-[state=open]:bg-white/10 transition-colors duration-200">
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 min-w-[160px] shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-motive text-white">
                <DropdownMenuItem
                  className="cursor-pointer flex flex-row items-center justify-between hover:bg-white/10 focus:bg-white/10 rounded-xl px-3 py-2.5 text-[13.5px] text-white/90 transition-colors duration-200"
                  onClick={() => {
                    setVisibilityType("private");
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <LockIcon size={12} />
                    <span>Private</span>
                  </div>
                  {visibilityType === "private" ? (
                    <CheckCircleFillIcon />
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex flex-row items-center justify-between hover:bg-white/10 focus:bg-white/10 rounded-xl px-3 py-2.5 text-[13.5px] text-white/90 transition-colors duration-200"
                  onClick={() => {
                    setVisibilityType("public");
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <GlobeIcon />
                    <span>Public</span>
                  </div>
                  {visibilityType === "public" ? <CheckCircleFillIcon /> : null}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-3 hover:bg-[#ff3333] focus:bg-[#ff3333] hover:text-white focus:text-white text-[#ff4444] rounded-xl px-3 py-2.5 text-[13.5px] mt-1 transition-all duration-200"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});
