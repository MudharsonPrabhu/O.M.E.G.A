import { useEffect, useState } from "react";
import type { AgentState, SystemTelemetry } from "../lib/systemState";
import { SYSTEM_MOOD_COLOR } from "../lib/moodTheme";
import type { BootPhase } from "../hooks/useBootSequence";
import { TypedText } from "./TypedText";
import { Waveform } from "./Waveform";

interface StatusStripProps {
  telemetry: SystemTelemetry;
  agents: AgentState[];
  phase: BootPhase;
  activeView?: "console" | "graph" | "study";
  onSelectView?: (view: "console" | "graph" | "study") => void;
  onOpenSettings?: () => void;
  connected?: boolean;
}

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useMoodSparkline(load: number) {
  const [history, setHistory] = useState<number[]>(() => Array(16).fill(0.2));
  useEffect(() => {
    setHistory((prev) => [...prev.slice(-15), Math.max(0.05, Math.min(1, load / 100))]);
  }, [load]);
  return history;
}

export function StatusStrip({
  telemetry,
  agents,
  phase,
  activeView = "console",
  onSelectView,
  onOpenSettings,
  connected = true,
}: StatusStripProps) {
  const time = useClock();
  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const booted = phase === "done";
  const sparkline = useMoodSparkline(telemetry.gpuPct);
  const activeCount = agents.filter((a) => a.status === "active").length;

  if (!booted) {
    return (
      <div className="flex h-11 items-center border-b border-panel-border bg-panel/60 px-4">
        <TypedText
          text="O.M.E.G.A — SYSTEM ONLINE — INITIALIZING AGENT MESH…"
          active={phase === "strip"}
          className="mono text-[11px] tracking-[0.08em] text-signal"
        />
      </div>
    );
  }

  return (
    <div className="flex h-11 items-center justify-between border-b border-panel-border bg-panel/60 px-4">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: connected ? "#5eead4" : "#fbbf24" }}
            title={connected ? "Backend Connected (ws://localhost:8000)" : "Backend Disconnected"}
          />
          <span className="font-semibold text-[13px] tracking-[0.04em] text-text">
            O.M.E.G.A
          </span>
        </div>

        {/* View Switcher Pills */}
        {onSelectView && (
          <div className="flex items-center gap-1 border-l border-panel-border pl-4">
            <button
              onClick={() => onSelectView("console")}
              className={`mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                activeView === "console"
                  ? "bg-signal/15 text-signal border border-signal/40 font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Cockpit
            </button>
            <button
              onClick={() => onSelectView("graph")}
              className={`mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                activeView === "graph"
                  ? "bg-pulse/15 text-pulse border border-pulse/40 font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Neural Graph
            </button>
            <button
              onClick={() => onSelectView("study")}
              className={`mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                activeView === "study"
                  ? "bg-research/15 text-research border border-research/40 font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Study Library
            </button>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="mono text-[11px] px-2.5 py-1 rounded text-text-muted hover:text-text hover:bg-white/5 transition-colors"
                title="System settings, Gemini keys & audit trail"
              >
                ⚙ Settings
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-7">
        <div className="flex items-baseline gap-2">
          <span className="label">time</span>
          <span className="mono text-[12px] font-medium text-signal">{timeStr}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="label">agents active</span>
          <span className="mono text-[12px] font-medium text-text">
            {String(activeCount).padStart(2, "0")} / {String(agents.length).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="label">system load</span>
          <span className="mono text-[12px] font-medium text-text">{telemetry.gpuPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="label">system mood</span>
          <span
            className="mono text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors duration-500"
            style={{ color: SYSTEM_MOOD_COLOR[telemetry.mood] }}
          >
            {telemetry.mood}
          </span>
          <Waveform values={sparkline} color={SYSTEM_MOOD_COLOR[telemetry.mood]} width={48} height={16} />
        </div>
      </div>
    </div>
  );
}
