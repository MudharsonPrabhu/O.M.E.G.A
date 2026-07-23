import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LaidOutEdge } from "../../hooks/useForceLayout";

const EDGE_OPACITY: Record<LaidOutEdge["kind"], number> = {
  routes: 0.35,
  chain: 0.28,
  touches: 0.15,
};

export function GraphEdge3D({ edge }: { edge: LaidOutEdge }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(Math.random());
  const srcVec = useRef(new THREE.Vector3());
  const tgtVec = useRef(new THREE.Vector3());

  const positions = useMemo(() => new Float32Array(6), []);
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);

  const color = useMemo(
    () => new THREE.Color(edge.source.color).lerp(new THREE.Color(edge.target.color), 0.5),
    [edge.source.color, edge.target.color]
  );
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: EDGE_OPACITY[edge.kind] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  const active = edge.source.active || edge.target.active;

  useFrame((_, delta) => {
    positions[0] = edge.source.x;
    positions[1] = edge.source.y;
    positions[2] = edge.source.z;
    positions[3] = edge.target.x;
    positions[4] = edge.target.y;
    positions[5] = edge.target.z;
    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    if (active && pulseRef.current) {
      progressRef.current = (progressRef.current + delta * 0.35) % 1;
      srcVec.current.set(edge.source.x, edge.source.y, edge.source.z);
      tgtVec.current.set(edge.target.x, edge.target.y, edge.target.z);
      pulseRef.current.position.lerpVectors(srcVec.current, tgtVec.current, progressRef.current);
    }
  });

  return (
    <>
      <primitive object={lineObject} />
      {active && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </>
  );
}
