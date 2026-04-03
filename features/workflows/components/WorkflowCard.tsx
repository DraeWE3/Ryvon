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
  workflow: Workflow | any;
  onToggle?: (id: string, active: boolean) => void;
  onRun?: (id: string) => void;
  isTemplate?: boolean;
  onUseTemplate?: (workflow: any) => void;
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

export function WorkflowCard({ workflow, onToggle, onRun, isTemplate, onUseTemplate }: WorkflowCardProps) {
  const Icon = ICON_MAP[workflow.icon] || Zap;

  return (
    <div
      className={cn(
        "group relative border border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 flex flex-col h-full transition-all duration-300 overflow-hidden",
        isTemplate 
          ? "hover:border-[#3071e1] hover:shadow-[0_8px_32px_rgba(48,113,225,0.15)] bg-black" 
          : "hover:border-[rgba(0,98,255,0.4)] hover:shadow-[0_0_40px_rgba(0,98,255,0.15)]"
      )}
      style={isTemplate ? {} : { background: 'linear-gradient(to top, rgba(0,98,255,0.25) 0%, #000000 20%)' }}
    >
      {/* Background Glow Effect */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#0062FF] opacity-10 blur-[80px] pointer-events-none group-hover:opacity-20 transition-opacity" />
      
      {/* Top Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex flex-col gap-3">
          <h3 className="font-gate text-[20px] text-[#ffffff] font-bold leading-tight m-0 pr-4 group-hover:text-[#0062FF] transition-colors">
            {workflow.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-motive text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.7)] px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.08)]">
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
      <p className="font-motive text-[13px] text-[rgba(255,255,255,0.50)] leading-relaxed m-0 mb-6 flex-1 relative z-10">
        {workflow.trigger_description || (workflow as any).triggerDescription || workflow.description || "No description provided."}
      </p>

      {/* Steps visualization for templates */}
      {isTemplate && workflow.steps && (
        <div className="flex flex-wrap gap-2 mb-6 relative z-10">
          {workflow.steps.map((s: any, i: number) => (
            <div key={s.id || i} className="flex items-center gap-1.5">
              <span className="font-motive text-[11px] text-[#A8CEE5] bg-[rgba(168,206,229,0.1)] border border-[rgba(168,206,229,0.2)] rounded-[8px] px-2 py-0.5">
                {s.agent}
              </span>
              {i < workflow.steps.length - 1 && (
                <span className="text-[rgba(255,255,255,0.2)] text-[10px]">→</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center mt-auto relative z-10 gap-3 w-full">
        {isTemplate ? (
          <button
            onClick={() => onUseTemplate?.(workflow)}
            className="w-full flex items-center justify-center py-2.5 rounded-[12px] border border-[rgba(255,255,255,0.15)] text-[#ffffff] font-motive text-[13px] transition-all hover:bg-[rgba(255,255,255,0.1)] active:scale-[0.98] group-hover:border-[#3071e1] group-hover:text-[#8cdff4]"
          >
            Use Template
          </button>
        ) : (
          <>
            <Link 
              href={`/workflows/${workflow.id}`}
              className="flex-1"
            >
              <button
                className="w-full py-2 px-4 rounded-[12px] font-gate text-[12px] text-[rgba(255,255,255,0.6)] hover:text-white transition-all bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center"
              >
                Open Workflow
              </button>
            </Link>
            <button
              onClick={() => onRun?.(workflow.id)}
              className="flex-1 py-2 px-4 rounded-[12px] font-gate text-[12px] font-bold text-white transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5"
              style={{
                background: "linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)",
                boxShadow: "0 4px 15px rgba(0, 125, 192, 0.3)"
              }}
            >
              <Play size={12} fill="currentColor" />
              Start Automation
            </button>
          </>
        )}
      </div>
    </div>
  );
}
