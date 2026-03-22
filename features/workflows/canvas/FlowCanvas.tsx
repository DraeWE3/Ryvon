"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./WorkflowNode";
import { NodeLibrarySidebar } from "./NodeLibrarySidebar";
import { CanvasToolbar } from "./CanvasToolbar";
import DotGrid from "./DotGrid";

interface FlowCanvasProps {
  projectName: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  isSaving?: boolean;
}

let nodeIdCounter = 0;
function getNodeId() {
  return `node_${Date.now()}_${++nodeIdCounter}`;
}

function FlowCanvasInner({
  projectName,
  initialNodes = [],
  initialEdges = [],
  onSave,
  isSaving,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Connect two nodes
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "default",
            animated: true,
            style: { stroke: "#0062FF", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data || !reactFlowInstance) return;

      const parsed = JSON.parse(data);

      // Get the canvas position from the drop coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNodeId(),
        type: parsed.nodeType || "workflowNode",
        position,
        data: {
          label: parsed.label,
          description: parsed.description,
          icon: parsed.icon,
          color: parsed.color,
          templateId: parsed.templateId,
          ...parsed.defaultData,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const handleSave = () => {
    onSave(nodes, edges);
  };

  return (
    <div className="flex h-full w-full">
      {/* Node Library Sidebar */}
      <NodeLibrarySidebar />

      {/* Canvas Area */}
      <div ref={reactFlowWrapper} className="flex-1 relative">
        <CanvasToolbar
          projectName={projectName}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#271E37"
          activeColor="#5227FF"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={{
            type: "default",
            animated: true,
            style: { stroke: "#0062FF", strokeWidth: 2 },
          }}
          connectionLineStyle={{ stroke: "#0062FF", strokeWidth: 2 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent", position: "relative", zIndex: 1 }}
        >
        </ReactFlow>
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider
export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
