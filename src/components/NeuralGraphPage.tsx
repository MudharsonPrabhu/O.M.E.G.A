import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { SystemState } from "../lib/systemState";
import { buildGraphData, type GraphNode, type GraphEdge } from "../lib/graphData";
import { useForceLayout, type LaidOutNode } from "../hooks/useForceLayout";
import { ForceGraphScene } from "./graph/ForceGraphScene";
import { TOKENS } from "../lib/moodTheme";
import { fetchKnowledgeGraph } from "../lib/api";

interface NeuralGraphPageProps {
  state: SystemState;
  onBack: () => void;
}

export function NeuralGraphPage({ state, onBack }: NeuralGraphPageProps) {
  const [persistentGraph, setPersistentGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchKnowledgeGraph()
      .then((data) => {
        if (data && data.nodes && data.nodes.length > 0) {
          setPersistentGraph(data);
        }
      })
      .catch((e) => console.warn("Backend graph fetch error, using local fallback", e));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      const data = await fetchKnowledgeGraph();
      setPersistentGraph(data);
      return;
    }
    const data = await fetchKnowledgeGraph(searchQuery.trim());
    setPersistentGraph(data);
  }

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (persistentGraph) {
      return persistentGraph;
    }
    return buildGraphData(state);
  }, [persistentGraph, state]);

  const { nodes, edges } = useForceLayout(rawNodes, rawEdges);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  // fit the camera to the actual extent of the graph
  const cameraDistance = useMemo(() => {
    const maxR = nodes.reduce((m, n) => Math.max(m, Math.hypot(n.x, n.y, n.z)), 0.001);
    return Math.max(4, maxR * 2.1);
  }, [nodes]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void">
      <div className="flex h-11 items-center justify-between border-b border-panel-border bg-panel/60 px-4">
        <button onClick={onBack} className="label flex items-center gap-2 hover:text-text">
          <span>‹</span> back
        </button>
        <div className="flex items-center gap-4">
          <span className="label tracking-[0.1em] text-text">
            Neural Graph <span className="text-text-muted">// Persistent Concept Network</span>
          </span>
          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="filter concept neighborhood…"
              className="mono text-[11px] bg-void border border-panel-border rounded px-2.5 py-0.5 text-text focus:outline-none focus:border-signal"
            />
          </form>
        </div>
        <span className="mono text-[11px] text-text-muted">
          {nodes.length} nodes · {edges.length} links
        </span>
      </div>

      <div className="relative flex-1">
        <Canvas camera={{ position: [0, 0, cameraDistance], fov: 50 }} dpr={[1, 1.75]}>
          <ForceGraphScene
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id || null)}
          />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            autoRotate
            autoRotateSpeed={0.35}
            minDistance={cameraDistance * 0.25}
            maxDistance={cameraDistance * 3}
          />
          <EffectComposer multisampling={0}>
            <DepthOfField target={[0, 0, 0]} focalLength={0.15} bokehScale={2} />
            <Bloom intensity={0.5} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur radius={0.4} />
            <Vignette eskil={false} offset={0.25} darkness={0.7} />
          </EffectComposer>
        </Canvas>

        <Legend />
        {selectedNode && <DetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<{ label: string; color: string }> = [
    { label: "agent", color: TOKENS.signal },
    { label: "thought", color: TOKENS.pulse },
    { label: "memory", color: TOKENS.memory },
  ];
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex gap-4 rounded border border-panel-border bg-panel/70 px-3 py-2 backdrop-blur-sm">
      {items.map((item) => (
        <span
          key={item.label}
          className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function DetailPanel({ node, onClose }: { node: LaidOutNode; onClose: () => void }) {
  return (
    <div className="absolute top-4 right-4 w-72 rounded border border-panel-border bg-panel/90 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-text">{node.label}</span>
        <button onClick={onClose} className="label hover:text-text">
          ×
        </button>
      </div>
      <span className="label mt-1 block" style={{ color: node.color }}>
        {node.kind}
      </span>
      {node.sub && <p className="mono mt-2 text-[11px] text-text-muted">{node.sub}</p>}
    </div>
  );
}
