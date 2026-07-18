import type { AgentType } from "./systemState";

// sonar-style pitch per agent — a single sine ping, not a UI chime
const AGENT_PITCH_HZ: Record<AgentType, number> = {
  orchestrator: 500,
  research: 660,
  coding: 440,
  data: 700,
  security: 340,
  memory: 520,
  ui: 620,
  scheduler: 400,
};

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playSonarPing(agentType: AgentType | null, volume = 0.05) {
  const audioCtx = getContext();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const freq = agentType ? AGENT_PITCH_HZ[agentType] : 300;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.95);
}
