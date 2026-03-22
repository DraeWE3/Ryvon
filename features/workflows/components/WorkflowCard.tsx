"use client";

import React from "react";
import { 
  Calendar, 
  Mail, 
  FileText, 
  Headphones, 
  Image as ImageIcon, 
  Star, 
  Zap,
  Play,
  Settings,
  MoreVertical
} from "lucide-react";
import type { Workflow } from "../types/workflow";
import { ToggleSwitch } from "./ToggleSwitch";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface WorkflowCardProps {
  workflow: Workflow;
  onToggle: (id: string, active: boolean) => void;
  onRun: (id: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Calendar,
  Mail,
  FileText,
  Headphones,
  ImageIcon,
  Star,
  Zap,
  Workflow: Zap,
};

export function WorkflowCard({ workflow, onToggle, onRun }: WorkflowCardProps) {
  const Icon = ICON_MAP[workflow.icon] || Zap;

  return (
    <div
      className="group relative border border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 flex flex-col h-full transition-all duration-300 hover:border-[rgba(0,98,255,0.4)] hover:shadow-[0_0_40px_rgba(0,98,255,0.15)] overflow-hidden"
      style={{ background: 'linear-gradient(to top, rgba(0,98,255,0.25) 0%, #000000 20%)' }}
    >
      {/* Background Glow Effect */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#0062FF] opacity-10 blur-[80px] pointer-events-none group-hover:opacity-20 transition-opacity" />
      
      {/* Top Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex flex-col gap-3">
          <h3 className="font-gate text-[20px] text-[#ffffff] font-bold leading-tight m-0 group-hover:text-[#0062FF] transition-colors">
            {workflow.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-motive text-[8px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] px-2 py-0.5 rounded-full bg-black border border-[rgba(255,255,255,0.1)]">
              {workflow.category || "General"}
            </span>
          </div>
        </div>
        
        {/* Icon Circle */}
        <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.6)] group-hover:text-white group-hover:border-[rgba(255,255,255,0.2)] transition-all">
          <Icon size={16} strokeWidth={1.5} />
        </div>
      </div>

      {/* Description */}
      <p className="font-motive text-[13px] text-[rgba(255,255,255,0.40)] leading-relaxed m-0 mb-8 flex-1 relative z-10">
        {workflow.trigger_description || (workflow as any).triggerDescription || "No description provided."}
      </p>

      {/* Footer Actions */}
      <div className="flex items-center justify-center mt-auto relative z-10">
        <Link 
          href={`/workflows/${workflow.id}`}
        >
          <button
            className="py-1.5 px-4 rounded-full font-gate text-[11px] font-bold text-white transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            style={{
              background: "linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)",
              boxShadow: "0 4px 15px rgba(0, 125, 192, 0.3)"
            }}
          >
            Use Template
          </button>
        </Link>
      </div>
    </div>
  );
}
