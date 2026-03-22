"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";

const AGENTS = ["Email", "Slack", "CRM", "AI", "HTTP", "Calendar", "Sheets", "Webhook"];

interface AddStepModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (step: { agent: string; action: string; params: Record<string, string> }) => void;
}

export function AddStepModal({ open, onClose, onAdd }: AddStepModalProps) {
  const [agent, setAgent] = useState("AI");
  const [action, setAction] = useState("");
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});

  if (!open) return null;

  const handleAddParam = () => {
    if (paramKey.trim()) {
      setParams((prev) => ({ ...prev, [paramKey.trim()]: paramValue.trim() }));
      setParamKey("");
      setParamValue("");
    }
  };

  const handleRemoveParam = (key: string) => {
    setParams((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!action.trim()) return;
    onAdd({ agent, action: action.trim(), params });
    // Reset form
    setAgent("AI");
    setAction("");
    setParams({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0a0a0a] border border-[rgba(255,255,255,0.10)] rounded-[20px] p-6 w-full max-w-md shadow-[0_0_60px_rgba(0,98,255,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-gate text-[18px] text-white font-medium">Add Step</h3>
          <button
            onClick={onClose}
            className="text-[rgba(255,255,255,0.40)] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Agent Selector */}
        <div className="mb-4">
          <label className="block font-motive text-[11px] text-[rgba(255,255,255,0.45)] uppercase tracking-wider mb-2">
            Agent
          </label>
          <div className="flex flex-wrap gap-2">
            {AGENTS.map((a) => (
              <button
                key={a}
                onClick={() => setAgent(a)}
                className={`font-motive text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                  agent === a
                    ? "bg-[rgba(0,98,255,0.15)] border-[#0062FF] text-[#0062FF]"
                    : "bg-transparent border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.50)] hover:border-[rgba(255,255,255,0.25)]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Action Input */}
        <div className="mb-4">
          <label className="block font-motive text-[11px] text-[rgba(255,255,255,0.45)] uppercase tracking-wider mb-2">
            Action
          </label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. Send summary email to team"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-[10px] px-4 py-2.5 font-motive text-[14px] text-white placeholder-[rgba(255,255,255,0.25)] outline-none focus:border-[#0062FF] transition-colors"
          />
        </div>

        {/* Params Section */}
        <div className="mb-6">
          <label className="block font-motive text-[11px] text-[rgba(255,255,255,0.45)] uppercase tracking-wider mb-2">
            Parameters (Optional)
          </label>

          {/* Existing params */}
          {Object.keys(params).length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {Object.entries(params).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] rounded-[8px] px-3 py-1.5">
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.60)]">{key}</span>
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.30)]">=</span>
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.50)] flex-1 truncate">{value}</span>
                  <button onClick={() => handleRemoveParam(key)} className="text-[rgba(255,100,100,0.50)] hover:text-[rgba(255,100,100,0.80)]">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add param row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={paramKey}
              onChange={(e) => setParamKey(e.target.value)}
              placeholder="key"
              className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-1.5 font-mono text-[12px] text-white placeholder-[rgba(255,255,255,0.20)] outline-none focus:border-[rgba(255,255,255,0.20)]"
            />
            <input
              type="text"
              value={paramValue}
              onChange={(e) => setParamValue(e.target.value)}
              placeholder="value"
              onKeyDown={(e) => e.key === "Enter" && handleAddParam()}
              className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-1.5 font-mono text-[12px] text-white placeholder-[rgba(255,255,255,0.20)] outline-none focus:border-[rgba(255,255,255,0.20)]"
            />
            <button
              onClick={handleAddParam}
              className="text-[rgba(255,255,255,0.30)] hover:text-white border border-[rgba(255,255,255,0.10)] rounded-[8px] p-1.5 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!action.trim()}
          className="w-full py-2.5 rounded-full font-gate text-[14px] font-bold text-white transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: action.trim()
              ? "linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)"
              : "rgba(255,255,255,0.08)",
            boxShadow: action.trim() ? "0 4px 15px rgba(0, 125, 192, 0.3)" : "none",
          }}
        >
          Add Step
        </button>
      </div>
    </div>
  );
}
