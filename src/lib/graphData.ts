import type { AgentState, AgentType, MemoryTouch, SystemState, ThoughtNode } from "./systemState";
import { AGENT_TYPE_COLOR, TOKENS } from "./moodTheme";

export type GraphNodeKind = "agent" | "memory" | "thought";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sub: string | null;
  color: string;
  size: number;
  active: boolean;
  raw: AgentState | MemoryTouch | ThoughtNode;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: "routes" | "chain" | "touches";
}

const MEMORY_TYPE_COLOR: Record<MemoryTouch["type"], string> = {
  entity: TOKENS.memory,
  session: TOKENS.pulse,
  source: TOKENS.research,
};

// heuristic only, purely for drawing an extra edge on the graph page —
// doesn't change the MemoryTouch contract itself
function inferAgentType(label: string): AgentType | null {
  const l = label.toLowerCase();
  if (l.includes("codebase") || l.includes("code")) return "coding";
  if (l.includes("research") || l.includes("paper")) return "research";
  if (l.includes("vector") || l.includes("knowledge graph") || l.includes("decision")) return "memory";
  if (l.includes("routing")) return "orchestrator";
  if (l.includes("user request")) return "ui";
  return null;
}

export function buildGraphData(state: SystemState): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const a of state.agents) {
    nodes.push({
      id: a.id,
      kind: "agent",
      label: a.name,
      sub: a.lastAction,
      color: AGENT_TYPE_COLOR[a.type],
      size: a.status === "active" ? 0.32 : 0.22,
      active: a.status === "active",
      raw: a,
    });
  }

  const orchestrator = state.agents.find((a) => a.type === "orchestrator");
  if (orchestrator) {
    for (const a of state.agents) {
      if (a.id === orchestrator.id) continue;
      edges.push({ source: orchestrator.id, target: a.id, kind: "routes" });
    }
  }

  const recentThoughts = state.thoughts.slice(-20);
  for (const t of recentThoughts) {
    nodes.push({
      id: t.id,
      kind: "thought",
      label: t.label,
      sub: t.status,
      color: t.status === "discarded" ? TOKENS.textMuted : TOKENS.pulse,
      size: 0.1 + t.confidence * 0.08,
      active: t.status === "exploring",
      raw: t,
    });
    if (t.parentId) {
      edges.push({ source: t.parentId, target: t.id, kind: "chain" });
    } else if (orchestrator) {
      edges.push({ source: orchestrator.id, target: t.id, kind: "routes" });
    }
  }

  const recentMemory = state.memory.slice(-20);
  let prevMemoryId: string | null = null;
  for (const m of recentMemory) {
    nodes.push({
      id: m.id,
      kind: "memory",
      label: m.label,
      sub: m.sourceRef,
      color: MEMORY_TYPE_COLOR[m.type],
      size: 0.16,
      active: false,
      raw: m,
    });
    if (prevMemoryId) edges.push({ source: prevMemoryId, target: m.id, kind: "touches" });

    const inferredType = inferAgentType(m.label);
    const sourceAgent = inferredType ? state.agents.find((a) => a.type === inferredType) : undefined;
    if (sourceAgent) edges.push({ source: sourceAgent.id, target: m.id, kind: "touches" });

    prevMemoryId = m.id;
  }

  return { nodes, edges };
}
