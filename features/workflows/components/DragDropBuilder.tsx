"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Save } from "lucide-react";
import type { Step } from "../types/workflow";
import { DraggableStepCard } from "./DraggableStepCard";
import { AddStepModal } from "./AddStepModal";

interface DragDropBuilderProps {
  initialSteps: Step[];
  workflowId: string;
  onSave: (steps: Step[]) => void;
  isSaving?: boolean;
}

export function DragDropBuilder({
  initialSteps,
  workflowId,
  onSave,
  isSaving,
}: DragDropBuilderProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync if initialSteps change externally (e.g. after save)
  useEffect(() => {
    setSteps(initialSteps);
    setHasChanges(false);
  }, [initialSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  }, []);

  const handleUpdateStep = useCallback((id: string, updates: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    setHasChanges(true);
  }, []);

  const handleDeleteStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setHasChanges(true);
  }, []);

  const handleAddStep = useCallback(
    (data: { agent: string; action: string; params: Record<string, string> }) => {
      const newStep: Step = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        agent: data.agent,
        action: data.action,
        params: data.params,
        depends_on: [],
      };
      setSteps((prev) => [...prev, newStep]);
      setHasChanges(true);
    },
    []
  );

  const handleSave = () => {
    onSave(steps);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Builder Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-gate text-[16px] text-[#ffffff] font-medium">
          Execution Steps
          <span className="font-motive text-[12px] text-[rgba(255,255,255,0.30)] ml-2">
            Drag to reorder
          </span>
        </h3>

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 font-motive text-[12px] text-white px-4 py-2 rounded-full transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)",
              boxShadow: "0 4px 15px rgba(0, 125, 192, 0.3)",
            }}
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {/* Sortable Step List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[rgba(255,255,255,0.10)] rounded-[16px] text-center">
                <p className="font-motive text-[14px] text-[rgba(255,255,255,0.35)] mb-1">
                  No steps yet
                </p>
                <p className="font-motive text-[12px] text-[rgba(255,255,255,0.20)]">
                  Add your first step below
                </p>
              </div>
            ) : (
              steps.map((step, index) => (
                <DraggableStepCard
                  key={step.id}
                  step={step}
                  index={index}
                  onUpdate={handleUpdateStep}
                  onDelete={handleDeleteStep}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Step Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 border border-dashed border-[rgba(255,255,255,0.10)] hover:border-[#0062FF] rounded-[16px] font-motive text-[13px] text-[rgba(255,255,255,0.40)] hover:text-[#0062FF] transition-all group"
      >
        <Plus size={16} className="group-hover:scale-110 transition-transform" />
        Add Step
      </button>

      {/* Add Step Modal */}
      <AddStepModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStep}
      />
    </div>
  );
}
