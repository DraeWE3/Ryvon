"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FlowCanvas } from "@/features/workflows/canvas/FlowCanvas";
import type { Node, Edge } from "@xyflow/react";

export default function NewWorkflowPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) {
      toast.error("Add at least one node to your workflow");
      return;
    }

    // Find the first trigger node for trigger info
    const triggerNode = nodes.find((n) =>
      ["form_submitted", "new_email", "schedule", "webhook"].includes(
        n.data.templateId as string
      )
    );

    // Convert nodes + edges into a linear step list
    // Build an adjacency map from edges
    const adjacency: Record<string, string[]> = {};
    edges.forEach((e) => {
      if (!adjacency[e.source]) adjacency[e.source] = [];
      adjacency[e.source].push(e.target);
    });

    // Find root nodes (nodes with no incoming edge)
    const targetIds = new Set(edges.map((e) => e.target));
    const rootNodeIds = nodes
      .filter((n) => !targetIds.has(n.id))
      .map((n) => n.id);

    // BFS traversal to build ordered steps
    const visited = new Set<string>();
    const orderedSteps: any[] = [];
    const queue = [...rootNodeIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = nodes.find((n) => n.id === current);
      if (node) {
        orderedSteps.push({
          id: node.id,
          agent: node.data.label as string,
          action: node.data.description as string,
          params: {
            templateId: node.data.templateId,
            icon: node.data.icon,
            color: node.data.color,
          },
          depends_on: edges
            .filter((e) => e.target === node.id)
            .map((e) => e.source),
        });
      }

      const children = adjacency[current] || [];
      children.forEach((child) => queue.push(child));
    }

    // Also add any unconnected nodes
    nodes.forEach((n) => {
      if (!visited.has(n.id)) {
        orderedSteps.push({
          id: n.id,
          agent: n.data.label as string,
          action: n.data.description as string,
          params: {
            templateId: n.data.templateId,
            icon: n.data.icon,
            color: n.data.color,
          },
          depends_on: [],
        });
      }
    });

    // Determine trigger type
    let triggerType = "manual";
    let triggerValue = "manual";
    let triggerDescription = "Manually triggered workflow";
    if (triggerNode) {
      const tid = triggerNode.data.templateId as string;
      if (tid === "schedule") {
        triggerType = "cron";
        triggerValue = (triggerNode.data.cron as string) || "0 8 * * *";
        triggerDescription = "Run on schedule";
      } else if (tid === "webhook" || tid === "form_submitted") {
        triggerType = "event";
        triggerValue = `webhook:${tid}`;
        triggerDescription = `Triggered by ${triggerNode.data.label}`;
      } else if (tid === "new_email") {
        triggerType = "event";
        triggerValue = "webhook:new_email";
        triggerDescription = "Triggered on incoming email";
      }
    }

    // Build workflow name from the first node or use default
    const workflowName =
      nodes.length > 0
        ? `${(nodes[0]?.data?.label as string) || "Workflow"} Flow`
        : "New Workflow";

    setIsSaving(true);
    try {
      const res = await fetch("/api/workflows/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          triggerType,
          triggerValue,
          triggerDescription,
          steps: orderedSteps,
          // Store the full canvas state for re-loading later
          canvasData: { nodes, edges },
          active: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create workflow");
      const wf = await res.json();

      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow saved!");
      router.push(`/workflows/${wf.id}`);
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden workflow-new-bg2">
      <FlowCanvas
        projectName="New Workflow"
        initialNodes={[]}
        initialEdges={[]}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
