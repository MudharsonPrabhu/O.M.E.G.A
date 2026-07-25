import { useState } from "react";
import type { AgentState, SystemTelemetry } from "../lib/systemState";
import { AGENT_IDLE_LABEL } from "../lib/systemState";
import { ACTIVE_COLOR, AGENT_TYPE_COLOR, TOKENS } from "../lib/moodTheme";
import { Waveform } from "./Waveform";

interface AgentRailProps {
  agents: AgentState[];
  telemetry: SystemTelemetry;
  collapsed: boolean;
  onToggle: () => void;
}

export function AgentRail({ agents, telemetry, collapsed, onToggle }: AgentRailProps) {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="label flex h-full w-6 items-center justify-center border-r border-panel-border bg-panel/40 hover:text-text"
        title="expand agent rail"
      >
        »
      </button>
    );
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-panel-border bg-panel/40">
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <span className="label">Agent Rail</span>
        <button onClick={onToggle} className="label hover:text-text" title="collapse">
          «
        </button>
      </div>

      <div className="rail-scroll flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="border-t border-panel-border px-3 py-3">
        <button className="label flex w-full items-center gap-2 text-text-muted hover:text-text">
          <span className="text-[13px] leading-none">+</span> deploy new agent
        </button>
      </div>

      <SystemStatusFooter telemetry={telemetry} />
    </aside>
  );
}

function AgentCard({ agent }: { agent: AgentState }) {
  const color = AGENT_TYPE_COLOR[agent.type];
  const isActive = agent.status === "active";
  const isError = agent.status === "error";
  const statusColor = isError ? TOKENS.alert : isActive ? ACTIVE_COLOR : color;
  const statusLabel = isError ? "error" : isActive ? "active" : AGENT_IDLE_LABEL[agent.type];

  return (
    <div className="flex items-center gap-2.5 rounded px-2 py-2 hover:bg-white/[0.02]">
      <span
        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full self-start"
        style={{ background: isError ? TOKENS.alert : color, marginTop: 5 }}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[12px] tracking-[0.02em] text-text uppercase">
          {agent.name}
        </span>
        <span
          className="mono block text-[10px] uppercase tracking-[0.08em]"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>
      <Waveform values={agent.waveform} color={statusColor} width={64} height={20} />
    </div>
  );
}

function SystemStatusFooter({ telemetry }: { telemetry: SystemTelemetry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-panel-border px-4 py-2.5">
      <button onClick={() => setOpen((v) => !v)} className="label flex w-full items-center justify-between">
        <span>System Status</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mono mt-2 space-y-1 text-[11px] text-text-muted">
          <div className="flex justify-between">
            <span>gpu load</span>
            <span className="text-text">{telemetry.gpuPct}%</span>
          </div>
          <div className="flex justify-between">
            <span>ram</span>
            <span className="text-text">{telemetry.ramGb.toFixed(1)}gb</span>
          </div>
          <div className="flex justify-between">
            <span>session cost</span>
            <span className="text-text">${telemetry.costUsd.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
