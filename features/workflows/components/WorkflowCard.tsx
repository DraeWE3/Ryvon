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
  Play
} from "lucide-react";
import type { Workflow } from "../types/workflow";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MOTION } from "@/lib/animations/motion";

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

export function WorkflowCard({ workflow, onRun, isTemplate, onUseTemplate }: WorkflowCardProps) {
  const Icon = ICON_MAP[workflow.icon] || Zap;
  
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: cardRef });

  const handleMouseEnter = contextSafe(() => {
    const tl = gsap.timeline();
    tl.to(cardRef.current, {
      scale: 1.02,
      duration: MOTION.fast,
      ease: "ryvon-snappy",
      borderColor: isTemplate ? "rgba(48,113,225,0.8)" : "rgba(0,111,191,0.5)",
      boxShadow: isTemplate 
        ? "0 8px 32px rgba(48,113,225,0.15)" 
        : "0 8px 40px rgba(0,111,191,0.2)"
    }, 0)
    .to(glowRef.current, {
      opacity: 0.3,
      y: -5,
      duration: MOTION.fast
    }, 0)
    .to(iconRef.current, {
      y: -2,
      rotate: 6,
      borderColor: "rgba(255,255,255,0.25)",
      color: "#ffffff",
      duration: MOTION.fast,
      ease: "power2.out"
    }, 0);
  });

  const handleMouseLeave = contextSafe(() => {
    const tl = gsap.timeline();
    tl.to(cardRef.current, {
      scale: 1,
      duration: MOTION.base,
      ease: "ryvon-soft",
      borderColor: "rgba(255,255,255,0.08)",
      boxShadow: "none"
    }, 0)
    .to(glowRef.current, {
      opacity: 0.15,
      y: 0,
      duration: MOTION.base
    }, 0)
    .to(iconRef.current, {
      y: 0,
      rotate: 0,
      borderColor: "rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.6)",
      duration: MOTION.base,
      ease: "power2.out"
    }, 0);
  });

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "workflow-card-item relative border border-[rgba(255,255,255,0.08)] bg-[#03060C] rounded-[24px] p-6 flex flex-col min-h-[240px] h-full overflow-hidden"
      )}
    >
      {/* Centered Bottom Glow Effect behind the button */}
      <div ref={glowRef} className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-[#007DC0] opacity-[0.15] blur-[40px] pointer-events-none" />
      
      {/* Top Header Row */}
      <div className="flex items-start justify-between mb-4 relative z-10 w-full">
        <h3 className="font-gate text-[20px] text-[#ffffff] font-bold leading-snug m-0 pr-4">
          {workflow.name}
        </h3>
        
        {/* Icon Circle */}
        <div ref={iconRef} className="flex-shrink-0 w-9 h-9 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.6)] shadow-sm mt-0.5">
          <Icon size={16} strokeWidth={1.5} />
        </div>
      </div>

      {/* Category Pill */}
      <div className="relative z-10 mb-5">
        <span className="font-gate text-[10px] font-bold tracking-wider text-[rgba(255,255,255,0.6)] px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.02)]">
          {(workflow.category || "GENERAL").toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <p className="font-motive text-[14px] font-medium text-[rgba(255,255,255,0.45)] leading-relaxed m-0 flex-1 relative z-10 pr-2 line-clamp-3">
        {workflow.trigger_description || (workflow as any).triggerDescription || workflow.description || "Manually triggered workflow"}
      </p>

      {/* Footer Actions */}
      <div className="flex items-center w-full mt-auto relative z-10 pt-5">
        {isTemplate ? (
          <button
            onClick={() => onUseTemplate?.(workflow)}
            className="w-[85%] mx-auto flex items-center justify-center h-[34px] rounded-full border border-[rgba(255,255,255,0.15)] text-[#ffffff] font-gate font-bold text-[12px] transition-all hover:bg-[rgba(255,255,255,0.1)] active:scale-[0.98] group-hover:border-[#3071e1] group-hover:text-[#8cdff4]"
          >
            Use Template
          </button>
        ) : (
          <button
            onClick={() => onRun?.(workflow.id)}
            className="w-[85%] mx-auto h-[34px] rounded-full font-gate text-[13px] font-bold text-white transition-all duration-300 hover:brightness-110 active:scale-[0.97] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(180deg, rgba(168,206,229,0.9) 0%, rgba(0,125,192,0.9) 50%, rgba(0,28,60,0.95) 100%)",
              boxShadow: "0 6px 20px rgba(0, 125, 192, 0.25), inset 0 1px 1px rgba(255,255,255,0.3)"
            }}
          >
            <Play size={12} fill="currentColor" className="mt-[1px]" />
            Start Automation
          </button>
        )}
      </div>
    </div>
  );
}
