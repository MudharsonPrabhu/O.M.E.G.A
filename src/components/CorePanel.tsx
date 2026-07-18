import { useEffect, useState, type ReactNode } from "react";
import type { SystemState } from "../lib/systemState";
import { MOOD_COLOR } from "../lib/moodTheme";
import { AICore, averageConfidence } from "./AICore";
import { Waveform } from "./Waveform";

interface CorePanelProps {
  state: SystemState;
  reducedMotion: boolean;
  motionOn: boolean;
  onToggleMotion: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

function reasoningDepth(state: SystemState): number {
  const last = state.thoughts[state.thoughts.length - 1];
  if (!last) return 0;
  const byId = new Map(state.thoughts.map((t) => [t.id, t]));
  let depth = 0;
  let cursor = last;
  while (cursor) {
    depth += 1;
    if (!cursor.parentId) break;
    const parent = byId.get(cursor.parentId);
    if (!parent) break;
    cursor = parent;
  }
  return depth;
}

function errorRatePct(mood: SystemState["telemetry"]["mood"]): number {
  if (mood === "degraded") return 1.8 + Math.random() * 2.2;
  if (mood === "elevated") return 0.1 + Math.random() * 0.3;
  return Math.random() * 0.05;
}

function useRollingHistory(value: number, length = 20): number[] {
  const [history, setHistory] = useState<number[]>(() => Array(length).fill(value));
  useEffect(() => {
    setHistory((prev) => [...prev.slice(-(length - 1)), value]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return history;
}

export function CorePanel({
  state,
  reducedMotion,
  motionOn,
  onToggleMotion,
  soundOn,
  onToggleSound,
}: CorePanelProps) {
  const confidence = averageConfidence(state);
  const confidenceHistory = useRollingHistory(confidence);
  const depth = reasoningDepth(state);
  const errorRate = errorRatePct(state.telemetry.mood);
  const moodColor = MOOD_COLOR[state.coreMood];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="label tracking-[0.1em] text-text-muted">
          AI Core <span className="text-text-muted/70">// Neural Waveform Synthesis</span>
        </span>
        <div className="flex items-center gap-3">
          <button onClick={onToggleMotion} className="label hover:text-text" title="toggle reduced motion">
            motion:{motionOn ? "auto" : "off"}
          </button>
          <button onClick={onToggleSound} className="label hover:text-text" title="toggle sonar sound">
            sound:{soundOn ? "on" : "off"}
          </button>
          <span
            className="mono flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
            style={{ borderColor: `${moodColor}55`, color: moodColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: moodColor }} />
            {state.coreMood}
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <AICore state={state} reducedMotion={reducedMotion} />
      </div>

      <div className="grid grid-cols-5 gap-4 border-t border-panel-border px-6 py-4">
        <Metric label="Tokens / Sec" value={String(state.telemetry.tokensPerSec)} />
        <Metric label="Context Window" value="128K" />
        <Metric label="Error Rate" value={`${errorRate.toFixed(2)}%`} />
        <Metric label="Reasoning Depth" value={String(depth)} />
        <Metric label="Confidence" value={confidence.toFixed(2)}>
          <Waveform values={confidenceHistory} color={moodColor} width={80} height={14} />
        </Metric>
      </div>
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mono mt-1 text-[18px] font-medium text-text">{value}</div>
      {children}
    </div>
  );
}
