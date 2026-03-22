"use client";

import React, { useState } from "react";
import {
  FileText, Mail, Calendar, Webhook, Brain, FileSearch,
  ScanText, Image as ImageIcon, GitFork, Timer, XCircle,
  Shuffle, MessageSquare, Ticket, Trello, Send,
  ChevronDown, ChevronUp, Search, Zap, Globe,
} from "lucide-react";
import { NODE_CATEGORIES } from "./nodeLibrary";

const ICON_MAP: Record<string, any> = {
  FileText, Mail, Calendar, Webhook, Brain, FileSearch,
  ScanText, Image: ImageIcon, ImageIcon, GitFork, Timer, XCircle,
  Shuffle, MessageSquare, Ticket, Trello, Send,
  Zap, Globe,
};

export function NodeLibrarySidebar() {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredCategories = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const onDragStart = (
    event: React.DragEvent,
    nodeData: (typeof NODE_CATEGORIES)[0]["items"][0]
  ) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        nodeType: "workflowNode",
        label: nodeData.label,
        description: nodeData.description,
        icon: nodeData.icon,
        color: nodeData.color,
        templateId: nodeData.id,
        defaultData: nodeData.defaultData,
      })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-[240px] h-full workflow-new-bg-sidebar border-r border-[rgba(255,255,255,0.08)] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h3 className="font-gate text-[14px] text-white font-semibold mb-3">
          Node Library
        </h3>
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.25)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[8px] pl-8 pr-3 py-2 font-motive text-[12px] text-white placeholder-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredCategories.map((category) => {
          const CatIcon = ICON_MAP[category.icon] || Zap;
          const isCollapsed = collapsed[category.name];

          return (
            <div key={category.name} className="mb-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-[rgba(255,255,255,0.03)] rounded-[6px] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <CatIcon
                    size={14}
                    style={{ color: category.color }}
                    strokeWidth={1.5}
                  />
                  <span
                    className="font-gate text-[12px] font-semibold"
                    style={{ color: category.color }}
                  >
                    {category.name}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown size={12} className="text-[rgba(255,255,255,0.25)]" />
                ) : (
                  <ChevronUp size={12} className="text-[rgba(255,255,255,0.25)]" />
                )}
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 ml-1">
                  {category.items.map((item) => {
                    const ItemIcon = ICON_MAP[item.icon] || Zap;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] cursor-grab active:cursor-grabbing hover:bg-[rgba(255,255,255,0.05)] transition-colors group/item"
                      >
                        <ItemIcon
                          size={14}
                          className="text-[rgba(255,255,255,0.45)] group-hover/item:text-[rgba(255,255,255,0.70)] transition-colors shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="font-motive text-[12px] text-[rgba(255,255,255,0.65)] group-hover/item:text-white transition-colors truncate">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
