// d3-force-3d ships no type declarations — minimal ambient types for the
// subset this app actually uses.
declare module "d3-force-3d" {
  export interface SimulationNodeDatum3D {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface Simulation<N> {
    tick(): Simulation<N>;
    stop(): Simulation<N>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    force(name: string, force: any): Simulation<N>;
    nodes(): N[];
  }

  export function forceSimulation<N extends SimulationNodeDatum3D>(
    nodes: N[],
    numDimensions?: number
  ): Simulation<N>;

  export interface ManyBodyForce {
    strength(v: number): ManyBodyForce;
  }
  export function forceManyBody(): ManyBodyForce;

  export interface LinkForce<N, L> {
    id(fn: (node: N, i: number, nodes: N[]) => string): LinkForce<N, L>;
    distance(v: number | ((l: L) => number)): LinkForce<N, L>;
    strength(v: number | ((l: L) => number)): LinkForce<N, L>;
  }
  export function forceLink<N, L>(links: L[]): LinkForce<N, L>;

  export interface CenterForce {
    strength(v: number): CenterForce;
  }
  export function forceCenter(x?: number, y?: number, z?: number): CenterForce;

  export interface CollideForce {
    strength(v: number): CollideForce;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceCollide(radius?: number | ((node: any) => number)): CollideForce;

  export interface AxisForce {
    strength(v: number): AxisForce;
  }
  export function forceX(x?: number): AxisForce;
  export function forceY(y?: number): AxisForce;
  export function forceZ(z?: number): AxisForce;
  export function forceRadial(radius: number, x?: number, y?: number, z?: number): unknown;
}
