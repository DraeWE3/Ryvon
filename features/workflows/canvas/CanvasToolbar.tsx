"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import { ZoomIn, ZoomOut, Undo2, Redo2, Copy, Save } from "lucide-react";

interface CanvasToolbarProps {
  projectName: string;
  onSave: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
}

export function CanvasToolbar({ projectName, onSave, isSaving, hasChanges }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
      {/* Left: Project Name */}
      <div className="pointer-events-auto">
        <span className="font-motive text-[12px] text-[rgba(255,255,255,0.35)]">Project: </span>
        <span className="font-gate text-[14px] text-white font-semibold">{projectName}</span>
      </div>

      {/* Center: Zoom + Actions */}
      <div className="flex items-center gap-1 pointer-events-auto bg-[rgba(5,8,18,0.85)] border border-[rgba(255,255,255,0.08)] rounded-[10px] px-2 py-1 backdrop-blur-sm">
        <span className="font-motive text-[11px] text-[rgba(255,255,255,0.40)] mr-1">Zoom</span>
        <button
          onClick={() => zoomIn()}
          className="p-1.5 rounded-[6px] text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-1.5 rounded-[6px] text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <div className="w-px h-5 bg-[rgba(255,255,255,0.08)] mx-1" />

        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-1.5 rounded-[6px] text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors font-motive text-[10px]"
          title="Fit View"
        >
          Fit
        </button>
      </div>

      {/* Right: Save */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 font-motive text-[12px] text-white px-4 py-2 rounded-[8px] transition-all disabled:opacity-50 border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.10)]"
        >
          <Save size={14} />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
