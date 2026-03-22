"use client";

import React from "react";
import type { Workflow } from "../types/workflow";
import { WorkflowCard } from "./WorkflowCard";
import { Skeleton } from "./Skeleton";

interface WorkflowGridProps {
  workflows?: Workflow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onToggle: (id: string, active: boolean) => void;
}

export function WorkflowGrid({ 
  workflows, 
  isLoading, 
  isError, 
  onRetry,
  onToggle 
}: WorkflowGridProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#000]">
        <p className="font-motive text-[14px] text-[rgba(255,100,100,0.90)] mb-4">
          Failed to load workflows
        </p>
        <button 
          onClick={onRetry}
          className="font-motive text-[13px] text-[#ffffff] bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.15)] rounded-[8px] px-[16px] py-[8px]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isLoading && workflows?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[64px] rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#000] mt-4">
        <h3 className="font-gate text-[18px] text-[#ffffff] mb-1">No workflows yet</h3>
        <p className="font-motive text-[13px] text-[rgba(255,255,255,0.45)] mb-6">Create your first workflow to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full pb-10">
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={`skel-card-${i}`} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[24px] p-6 h-[240px] flex flex-col gap-4">
            <div className="flex justify-between">
                <Skeleton height={24} width="60%" />
                <Skeleton height={40} width={40} borderRadius={20} />
            </div>
            <Skeleton height={12} width="30%" borderRadius={6} />
            <Skeleton height={60} width="100%" />
            <div className="mt-auto flex justify-between">
                <Skeleton height={40} width="70%" borderRadius={20} />
                <Skeleton height={24} width={44} borderRadius={12} />
            </div>
          </div>
        ))
      ) : (
        workflows?.map((workflow) => (
          <WorkflowCard 
            key={workflow.id} 
            workflow={workflow} 
            onToggle={onToggle}
            onRun={() => {}} // Placeholder for direct run if needed
          />
        ))
      )}
    </div>
  );
}
