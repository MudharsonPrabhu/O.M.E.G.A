import type { LaidOutEdge, LaidOutNode } from "../../hooks/useForceLayout";
import { GraphEdge3D } from "./GraphEdge3D";
import { GraphNode3D } from "./GraphNode3D";

interface ForceGraphSceneProps {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ForceGraphScene({ nodes, edges, selectedId, onSelect }: ForceGraphSceneProps) {
  return (
    <group onPointerMissed={() => onSelect("")}>
      {edges.map((e, i) => (
        <GraphEdge3D key={i} edge={e} />
      ))}
      {nodes.map((n) => (
        <GraphNode3D key={n.id} node={n} selected={n.id === selectedId} onSelect={onSelect} />
      ))}
    </group>
  );
}
