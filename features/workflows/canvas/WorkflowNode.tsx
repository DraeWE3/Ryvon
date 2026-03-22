"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileText, Mail, Calendar, Webhook, Brain, FileSearch,
  ScanText, Image as ImageIcon, GitFork, Timer, XCircle,
  Shuffle, MessageSquare, Ticket, Trello, Send,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  FileText, Mail, Calendar, Webhook, Brain, FileSearch,
  ScanText, Image: ImageIcon, ImageIcon, GitFork, Timer, XCircle,
  Shuffle, MessageSquare, Ticket, Trello, Send,
};

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const Icon = ICON_MAP[data.icon as string] || Brain;
  const color = (data.color as string) || "#8cdff4";

  return (
    <div
      className={`relative min-w-[180px] max-w-[220px] rounded-[14px] border transition-all duration-200 cursor-pointer ${
        selected
          ? "border-[#0062FF] shadow-[0_0_20px_rgba(0,98,255,0.35)]"
          : "border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)]"
      }`}
      style={{
        background: "linear-gradient(180deg, rgba(10,15,30,0.95) 0%, rgba(0,0,0,0.98) 100%)",
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-[10px] !h-[10px] !rounded-full !border-2 !border-[#0062FF] !bg-[#0a0f1e]"
      />

      <div className="p-4">
        {/* Icon + Label Row */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0"
            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
          >
            <Icon size={18} style={{ color }} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-gate text-[13px] text-white font-semibold leading-tight truncate">
              {data.label as string}
            </span>
            <span className="font-motive text-[10px] text-[rgba(255,255,255,0.40)] leading-tight mt-0.5">
              {data.description as string}
            </span>
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-[10px] !h-[10px] !rounded-full !border-2 !border-[#0062FF] !bg-[#0a0f1e]"
      />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);

// Node type registry for React Flow
export const nodeTypes = {
  workflowNode: WorkflowNode,
};
