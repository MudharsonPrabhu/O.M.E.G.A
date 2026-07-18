import type { AgentType, CoreMood } from "./systemState";

// Hex tokens live in Tailwind theme too (index.css @theme) — mirrored here
// as raw values because three.js Color/material props need JS numbers/strings,
// not CSS custom properties.
export const TOKENS = {
  void: "#07080c",
  panel: "#0f1218",
  panelBorder: "#1c212b",
  signal: "#5eead4",
  pulse: "#7c9cff",
  coding: "#3b82f6",
  research: "#b794f6",
  memory: "#34d399",
  warning: "#fbbf24",
  alert: "#fb5d6b",
  text: "#eaf0ff",
  textMuted: "#6b7688",
} as const;

export const MOOD_COLOR: Record<CoreMood, string> = {
  idle: TOKENS.signal,
  thinking: TOKENS.pulse,
  coding: TOKENS.coding,
  error: TOKENS.alert,
};

export const AGENT_TYPE_COLOR: Record<AgentType, string> = {
  orchestrator: TOKENS.signal,
  research: TOKENS.research,
  coding: TOKENS.coding,
  data: TOKENS.warning,
  security: TOKENS.alert,
  memory: TOKENS.memory,
  ui: TOKENS.pulse,
  scheduler: TOKENS.coding,
};

// "active" always reads as a healthy green regardless of agent type; any
// other status (idle/standby/monitoring/error) uses the agent's own color
export const ACTIVE_COLOR = TOKENS.memory;

export const MOOD_LABEL: Record<CoreMood, string> = {
  idle: "nominal",
  thinking: "elevated",
  coding: "elevated",
  error: "degraded",
};

export const SYSTEM_MOOD_COLOR: Record<"nominal" | "elevated" | "degraded", string> = {
  nominal: TOKENS.signal,
  elevated: TOKENS.pulse,
  degraded: TOKENS.alert,
};

// the Core's idle breathing rate — the command console's cursor blinks in
// lockstep with this so the whole UI reads as one instrument
export const IDLE_FREQUENCY_HZ = 0.2;
