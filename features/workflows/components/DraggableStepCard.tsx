"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Step } from "../types/workflow";

const AGENTS = ["Email", "Slack", "CRM", "AI", "HTTP", "Calendar", "Sheets", "Webhook"];

interface DraggableStepCardProps {
  step: Step;
  index: number;
  onUpdate: (id: string, updates: Partial<Step>) => void;
  onDelete: (id: string) => void;
}

export function DraggableStepCard({ step, index, onUpdate, onDelete }: DraggableStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-[#000] border rounded-[16px] p-5 transition-all duration-200 ${
        isDragging
          ? "border-[#0062FF] shadow-[0_0_30px_rgba(0,98,255,0.25)] scale-[1.02] z-50 opacity-90"
          : "border-[rgba(255,255,255,0.10)] hover:border-[rgba(0,98,255,0.3)]"
      }`}
    >
      {/* Step number connector line */}
      <div className="absolute -top-5 left-7 w-px h-5 bg-[rgba(255,255,255,0.08)]" />

      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-[rgba(255,255,255,0.20)] hover:text-[rgba(255,255,255,0.50)] transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>

        {/* Step Number */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[rgba(0,98,255,0.15)] border border-[rgba(0,98,255,0.3)] text-[#0062FF] font-gate text-[12px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Agent + Action Row */}
          <div className="flex items-center gap-3 mb-2">
            {/* Agent Selector */}
            <select
              value={step.agent}
              onChange={(e) => onUpdate(step.id, { agent: e.target.value })}
              className="font-motive text-[11px] text-[#8cdff4] bg-[rgba(140,223,244,0.08)] border border-[rgba(140,223,244,0.2)] rounded-full px-3 py-1 uppercase tracking-wider cursor-pointer hover:bg-[rgba(140,223,244,0.15)] transition-colors appearance-none outline-none"
            >
              {AGENTS.map((a) => (
                <option key={a} value={a} className="bg-[#111] text-white">
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Action Input */}
          <input
            type="text"
            value={step.action}
            onChange={(e) => onUpdate(step.id, { action: e.target.value })}
            placeholder="Step action description..."
            className="w-full bg-transparent border-none outline-none font-motive text-[14px] text-white placeholder-[rgba(255,255,255,0.25)] focus:ring-0"
          />

          {/* Interactive Parameters Editor */}
          <div className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 font-motive text-[11px] text-[rgba(255,255,255,0.35)] hover:text-[#8cdff4] transition-colors uppercase tracking-wider mb-2"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Configure Parameters ({(step.params && Object.keys(step.params).length) || 0})
            </button>
            
            {isExpanded && (
              <div className="flex flex-col gap-2 mt-2">
                {/* Existing keys */}
                {step.params && Object.entries(step.params).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 group/param">
                    <input
                      type="text"
                      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-[4px] px-2 py-1 font-mono text-[11px] text-[#8cdff4] w-1/3 focus:outline-none focus:border-[#8cdff4]"
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value
                        const newParams = { ...step.params }
                        const val = newParams[key]
                        delete newParams[key]
                        if (newKey) newParams[newKey] = val
                        onUpdate(step.id, { params: newParams })
                      }}
                      placeholder="Key (e.g. to)"
                    />
                    <input
                      type="text"
                      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-[4px] px-2 py-1 font-mono text-[11px] text-white flex-1 focus:outline-none focus:border-[#8cdff4]"
                      value={typeof value === "object" ? JSON.stringify(value) : String(value)}
                      onChange={(e) => {
                        const newParams = { ...step.params, [key]: e.target.value }
                        onUpdate(step.id, { params: newParams })
                      }}
                      placeholder="Value (e.g. user@example.com)"
                    />
                    <button
                      onClick={() => {
                        const newParams = { ...step.params }
                        delete newParams[key]
                        onUpdate(step.id, { params: newParams })
                      }}
                      className="text-[rgba(255,255,255,0.2)] hover:text-[#ff6464] transition-colors opacity-0 group-hover/param:opacity-100 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                
                {/* Add new param button */}
                <button
                  onClick={() => {
                    const newParams = { ...step.params, '': '' }
                    onUpdate(step.id, { params: newParams })
                  }}
                  className="font-motive text-[10px] text-[rgba(140,223,244,0.6)] hover:text-[#8cdff4] border border-[rgba(140,223,244,0.2)] hover:border-[#8cdff4] rounded-[4px] py-1 px-2 self-start transition-colors mt-1"
                >
                  + Add Parameter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(step.id)}
          className="mt-1 text-[rgba(255,100,100,0.30)] hover:text-[rgba(255,100,100,0.80)] transition-colors opacity-0 group-hover:opacity-100"
          title="Remove step"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
