import { useMemo } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, forceZ } from "d3-force-3d";
import type { GraphEdge, GraphNode } from "../lib/graphData";

export interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
  z: number;
}

export interface LaidOutEdge {
  source: LaidOutNode;
  target: LaidOutNode;
  kind: GraphEdge["kind"];
}

export function useForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  return useMemo(() => {
    // seed on a sphere (golden-angle spiral) so the simulation relaxes
    // outward from a stable start instead of an exploding point cluster
    const simNodes = nodes.map((n, i) => {
      const t = nodes.length > 1 ? i / (nodes.length - 1) : 0;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 3;
      return {
        ...n,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      };
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simLinks = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ ...e }));

    const sim = forceSimulation(simNodes, 3)
      .force("charge", forceManyBody().strength(-2.5))
      .force(
        "link",
        forceLink<(typeof simNodes)[number], (typeof simLinks)[number]>(simLinks)
          .id((d) => d.id)
          .distance(1.1)
          .strength(0.8)
      )
      .force("center", forceCenter(0, 0, 0))
      .force("collide", forceCollide(0.4))
      // gentle centering springs — forceCenter only re-centers the average,
      // it doesn't pull outliers in, so without this weakly-linked nodes
      // drift arbitrarily far from the cluster
      .force("x", forceX(0).strength(0.05))
      .force("y", forceY(0).strength(0.05))
      .force("z", forceZ(0).strength(0.05))
      .stop();

    for (let i = 0; i < 260; i++) sim.tick();

    // d3-force mutates each link's source/target from string ids into node
    // object references once the "link" force initializes — safe to treat
    // as LaidOutEdge from here on
    return { nodes: simNodes as LaidOutNode[], edges: simLinks as unknown as LaidOutEdge[] };
  }, [nodes, edges]);
}
