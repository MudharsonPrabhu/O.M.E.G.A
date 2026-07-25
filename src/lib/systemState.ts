// ============================================================================
// O.M.E.G.A — System State Contract + Mock Data Hook
// ============================================================================
// This file defines the exact data shapes the UI renders against, plus a
// mock implementation that cycles through realistic states for demo/dev.
//
// Contract rule: when the real backend (LangGraph orchestrator / WebSocket
// server) is built, it should emit data matching these exact types over the
// same channel. Swap `useMockSystemState` for `useLiveSystemState` and the
// UI requires zero changes.
// ============================================================================

import { useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type CoreMood = "idle" | "thinking" | "coding" | "error";

export type AgentType =
  | "orchestrator"
  | "research"
  | "coding"
  | "data"
  | "security"
  | "memory"
  | "ui"
  | "scheduler";

export type AgentStatus = "idle" | "active" | "error";

export interface AgentState {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  /** 0–1, confidence in current action/result */
  confidence: number;
  lastAction: string;
  /** rolling amplitude values for the agent's mini-waveform, most recent last */
  waveform: number[];
  timestamp: number;
}

export interface ThoughtNode {
  id: string;
  parentId: string | null;
  label: string;
  confidence: number;
  status: "exploring" | "converged" | "discarded";
  timestamp: number;
}

export interface MemoryTouch {
  id: string;
  label: string;
  type: "entity" | "session" | "source";
  linkedTo: string[];
  /** provenance pointer — file, URL, or doc id this memory traces back to */
  sourceRef: string | null;
  timestamp: number;
}

export interface SystemTelemetry {
  tasksActive: number;
  agentsRunning: number;
  gpuPct: number;
  ramGb: number;
  tokensPerSec: number;
  costUsd: number;
  mood: "nominal" | "elevated" | "degraded";
}

export interface SystemState {
  coreMood: CoreMood;
  /** drives the Core mesh deformation directly — 0–1 */
  coreAmplitude: number;
  /** drives deformation speed — Hz, roughly 0.1–2 */
  coreFrequency: number;
  agents: AgentState[];
  thoughts: ThoughtNode[];
  memory: MemoryTouch[];
  telemetry: SystemTelemetry;
}

// ----------------------------------------------------------------------------
// Mock agent roster (static identity, dynamic state)
// ----------------------------------------------------------------------------

const AGENT_ROSTER: Array<{ id: string; name: string; type: AgentType }> = [
  { id: "agt-orchestrator", name: "Orchestrator", type: "orchestrator" },
  { id: "agt-research", name: "Researcher", type: "research" },
  { id: "agt-coding", name: "Code Engineer", type: "coding" },
  { id: "agt-data", name: "Data Analyst", type: "data" },
  { id: "agt-security", name: "Security Guard", type: "security" },
  { id: "agt-memory", name: "Memory Keeper", type: "memory" },
  { id: "agt-ui", name: "User Interface", type: "ui" },
  { id: "agt-scheduler", name: "Scheduler", type: "scheduler" },
];

const SAMPLE_ACTIONS: Record<AgentType, string[]> = {
  orchestrator: ["routing task graph", "delegating subtasks", "aggregating results"],
  research: ["scanning sources", "cross-referencing claims", "ranking relevance"],
  coding: ["editing 3 files", "running test suite", "resolving type error"],
  data: ["profiling dataset", "running aggregation", "flagging outliers"],
  security: ["scanning permissions", "auditing request", "checking rate limits"],
  memory: ["indexing session", "linking entities", "pruning stale nodes"],
  ui: ["rendering view", "awaiting input", "syncing client state"],
  scheduler: ["queuing job", "awaiting trigger", "resolving cron window"],
};

// display label used while an agent is idle — matches the flavor of its role
// rather than a flat "idle" for every agent
export const AGENT_IDLE_LABEL: Record<AgentType, string> = {
  orchestrator: "standby",
  research: "standby",
  coding: "idle",
  data: "idle",
  security: "monitoring",
  memory: "idle",
  ui: "idle",
  scheduler: "standby",
};

export const THOUGHT_LABELS = [
  "parsing intent",
  "routing → coding agent",
  "checking prior context",
  "evaluating approach A",
  "evaluating approach B",
  "discarding approach A",
  "converging on plan",
  "delegating to research agent",
  "3 files touched",
  "verifying output",
];

// realistic memory-touch events for the mock feed — label content (not the
// `type` field) hints at which icon MemoryRail should render
const MEMORY_EVENTS: Array<{ label: string; type: MemoryTouch["type"]; sourceRef: string | null }> = [
  { label: "User Request Analysis", type: "session", sourceRef: null },
  { label: "Vector Search Result", type: "entity", sourceRef: "doc://graphrag/index.md" },
  { label: "Research Paper Ingestion", type: "source", sourceRef: "doc://papers/arxiv_2401.pdf" },
  { label: "Codebase Context Load", type: "entity", sourceRef: "src://repo/omega" },
  { label: "Knowledge Graph Update", type: "entity", sourceRef: null },
  { label: "Decision: Use GraphRAG", type: "session", sourceRef: null },
  { label: "Agent Routing: Code Engineer", type: "session", sourceRef: null },
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

function randomWaveform(length = 24, baseAmplitude = 0.15): number[] {
  return Array.from({ length }, () => baseAmplitude + Math.random() * baseAmplitude);
}

function pushWaveform(prev: number[], value: number, max = 24): number[] {
  const next = [...prev, value];
  return next.length > max ? next.slice(next.length - max) : next;
}

function initialAgentState(roster: (typeof AGENT_ROSTER)[number]): AgentState {
  return {
    id: roster.id,
    name: roster.name,
    type: roster.type,
    status: "idle",
    confidence: 0.5,
    lastAction: "awaiting task",
    waveform: randomWaveform(),
    timestamp: Date.now(),
  };
}

function initialTelemetry(): SystemTelemetry {
  return {
    tasksActive: 0,
    agentsRunning: 0,
    gpuPct: 8,
    ramGb: 4.2,
    tokensPerSec: 0,
    costUsd: 0,
    mood: "nominal",
  };
}

// ----------------------------------------------------------------------------
// Mock hook
// ----------------------------------------------------------------------------
// Cycles the whole system through a believable idle → thinking → coding →
// error → idle loop, updating agents/thoughts/memory/telemetry in tandem so
// the Core, rails, and console all stay visually consistent with each other.

const MOOD_SEQUENCE: CoreMood[] = ["idle", "thinking", "coding", "idle", "thinking", "error", "idle"];
const MOOD_DURATIONS_MS: Record<CoreMood, number> = {
  idle: 4000,
  thinking: 3500,
  coding: 5000,
  error: 2200,
};

export function useMockSystemState(tickMs = 400): SystemState {
  const moodIndexRef = useRef(0);
  const moodElapsedRef = useRef(0);
  const thoughtHistoryRef = useRef<ThoughtNode[]>([]);
  const memoryHistoryRef = useRef<MemoryTouch[]>([]);
  const stateRef = useRef<SystemState | undefined>(undefined);

  const [state, setState] = useState<SystemState>(() => ({
    coreMood: "idle",
    coreAmplitude: 0.15,
    coreFrequency: 0.2,
    agents: AGENT_ROSTER.map(initialAgentState),
    thoughts: [],
    memory: [],
    telemetry: initialTelemetry(),
  }));
  stateRef.current = state;

  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current!;
      moodElapsedRef.current += tickMs;
      let mood = MOOD_SEQUENCE[moodIndexRef.current];

      if (moodElapsedRef.current >= MOOD_DURATIONS_MS[mood]) {
        moodElapsedRef.current = 0;
        moodIndexRef.current = (moodIndexRef.current + 1) % MOOD_SEQUENCE.length;
        mood = MOOD_SEQUENCE[moodIndexRef.current];
      }

      // amplitude/frequency per mood, with jitter so it never looks looped
      const jitter = () => (Math.random() - 0.5) * 0.06;
      const moodParams: Record<CoreMood, { amp: number; freq: number }> = {
        idle: { amp: 0.15, freq: 0.2 },
        thinking: { amp: 0.45, freq: 1.1 },
        coding: { amp: 0.6, freq: 1.6 },
        error: { amp: 0.85, freq: 2.4 },
      };
      const { amp, freq } = moodParams[mood];

      // pick 0-2 agents to be "active" based on mood
      const activeCount = mood === "idle" ? 0 : mood === "error" ? 1 : Math.random() < 0.5 ? 1 : 2;
      const activeIds = new Set(
        [...AGENT_ROSTER]
          .sort(() => Math.random() - 0.5)
          .slice(0, activeCount)
          .map((a) => a.id)
      );

      const agents: AgentState[] = current.agents.map((a) => {
        const isActive = activeIds.has(a.id);
        const isError = mood === "error" && isActive;
        const targetValue = isError ? 0.9 : isActive ? 0.4 + Math.random() * 0.4 : 0.1 + Math.random() * 0.1;
        const actions = SAMPLE_ACTIONS[a.type];
        return {
          ...a,
          status: isError ? "error" : isActive ? "active" : "idle",
          confidence: isActive ? 0.6 + Math.random() * 0.35 : a.confidence,
          lastAction: isActive ? actions[Math.floor(Math.random() * actions.length)] : a.lastAction,
          waveform: pushWaveform(a.waveform, Math.max(0, Math.min(1, targetValue + jitter()))),
          timestamp: Date.now(),
        };
      });

      // occasionally append a thought node while thinking/coding
      if ((mood === "thinking" || mood === "coding") && Math.random() < 0.35) {
        const label = THOUGHT_LABELS[Math.floor(Math.random() * THOUGHT_LABELS.length)];
        const parent = thoughtHistoryRef.current[thoughtHistoryRef.current.length - 1] ?? null;
        const node: ThoughtNode = {
          id: nextId("thought"),
          parentId: parent?.id ?? null,
          label,
          confidence: 0.5 + Math.random() * 0.5,
          status: Math.random() < 0.15 ? "discarded" : "exploring",
          timestamp: Date.now(),
        };
        thoughtHistoryRef.current = [...thoughtHistoryRef.current, node].slice(-40);
      }

      // occasionally append a memory touch
      if (mood !== "idle" && Math.random() < 0.15) {
        const event = MEMORY_EVENTS[Math.floor(Math.random() * MEMORY_EVENTS.length)];
        const linkCount = Math.floor(Math.random() * 2) + 1;
        const linkedTo = Array.from({ length: linkCount }, () => {
          const kind = Math.random() < 0.5 ? "RQ" : "MEM";
          return `${kind}_${Math.floor(1000 + Math.random() * 9000)}`;
        });
        const touch: MemoryTouch = {
          id: nextId("mem"),
          label: event.label,
          type: event.type,
          linkedTo,
          sourceRef: event.sourceRef,
          timestamp: Date.now(),
        };
        memoryHistoryRef.current = [...memoryHistoryRef.current, touch].slice(-30);
      }

      const runningCount = agents.filter((a) => a.status === "active").length;

      setState({
        coreMood: mood,
        coreAmplitude: Math.max(0.05, Math.min(1, amp + jitter())),
        coreFrequency: Math.max(0.05, freq + jitter()),
        agents,
        thoughts: thoughtHistoryRef.current,
        memory: memoryHistoryRef.current,
        telemetry: {
          tasksActive: runningCount,
          agentsRunning: runningCount,
          gpuPct: Math.round(10 + amp * 70 + Math.random() * 5),
          ramGb: Math.round((4 + amp * 6) * 10) / 10,
          tokensPerSec: mood === "idle" ? 0 : Math.round(20 + amp * 180),
          costUsd: Math.round((current.telemetry.costUsd + (mood === "idle" ? 0 : 0.0004)) * 10000) / 10000,
          mood: mood === "error" ? "degraded" : amp > 0.5 ? "elevated" : "nominal",
        },
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [tickMs]);

  return state;
}

// ----------------------------------------------------------------------------
// Live hook: connects to real backend WebSocket, updates live telemetry,
// thoughts, agents, memory, and approval events in real-time.
// ----------------------------------------------------------------------------

export interface LiveSystemStateResult {
  state: SystemState;
  connected: boolean;
  pendingApprovals: any[];
  clearApproval: (actionId: string) => void;
}

export function useLiveSystemState(wsUrl = "ws://localhost:8000/api/events"): LiveSystemStateResult {
  const [connected, setConnected] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const [state, setState] = useState<SystemState>(() => ({
    coreMood: "idle",
    coreAmplitude: 0.15,
    coreFrequency: 0.2,
    agents: AGENT_ROSTER.map(initialAgentState),
    thoughts: [],
    memory: [],
    telemetry: initialTelemetry(),
  }));

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isDisposed) return;
          setConnected(true);
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const msg = JSON.parse(event.data);
            const type = msg.type;
            const data = msg.data;

            if (type === "telemetry") {
              setState((prev) => {
                const mood: CoreMood =
                  data.mood === "degraded"
                    ? "error"
                    : prev.coreMood === "thinking" || prev.coreMood === "coding"
                    ? prev.coreMood
                    : "idle";

                const amp = mood === "error" ? 0.85 : mood === "coding" ? 0.6 : mood === "thinking" ? 0.45 : 0.15;
                const freq = mood === "error" ? 2.2 : mood === "coding" ? 1.6 : mood === "thinking" ? 1.1 : 0.2;

                return {
                  ...prev,
                  coreMood: mood,
                  coreAmplitude: amp,
                  coreFrequency: freq,
                  telemetry: {
                    ...prev.telemetry,
                    ...data,
                  },
                };
              });
            } else if (type === "thought") {
              setState((prev) => ({
                ...prev,
                thoughts: [...prev.thoughts.slice(-29), data],
              }));
            } else if (type === "agent_update") {
              setState((prev) => ({
                ...prev,
                agents: prev.agents.map((a) => (a.type === data.type ? { ...a, ...data } : a)),
              }));
            } else if (type === "task_state") {
              setState((prev) => {
                let mood: CoreMood = "idle";
                if (data.status === "planning") mood = "thinking";
                else if (data.status === "running") mood = "coding";
                else if (data.status === "failed") mood = "error";
                else if (data.status === "completed") mood = "idle";

                const amp = mood === "error" ? 0.85 : mood === "coding" ? 0.6 : mood === "thinking" ? 0.45 : 0.15;
                const freq = mood === "error" ? 2.2 : mood === "coding" ? 1.6 : mood === "thinking" ? 1.1 : 0.2;

                return {
                  ...prev,
                  coreMood: mood,
                  coreAmplitude: amp,
                  coreFrequency: freq,
                };
              });
            } else if (type === "memory_touch") {
              setState((prev) => ({
                ...prev,
                memory: [...prev.memory.slice(-29), data],
              }));
            } else if (type === "approval_request") {
              setPendingApprovals((prev) => [...prev.filter((p) => p.action_id !== data.action_id), data]);
            }
          } catch (err) {
            console.error("OMEGA: failed to parse WebSocket event", err);
          }
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [wsUrl]);

  const clearApproval = (actionId: string) => {
    setPendingApprovals((prev) => prev.filter((p) => p.action_id !== actionId));
  };

  return { state, connected, pendingApprovals, clearApproval };
}
