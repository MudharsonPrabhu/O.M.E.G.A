import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { LaidOutNode } from "../../hooks/useForceLayout";

interface GraphNode3DProps {
  node: LaidOutNode;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function GraphNode3D({ node, selected, onSelect }: GraphNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const bobPhase = useRef(Math.random() * Math.PI * 2);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(node.size, 1), [node.size]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetScale = hovered || selected ? 1.4 : 1;
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x || 1, targetScale, Math.min(1, delta * 6));
    meshRef.current.scale.setScalar(s);
    meshRef.current.position.y = Math.sin(performance.now() * 0.0006 + bobPhase.current) * 0.05;
    if (node.active) meshRef.current.rotation.y += delta * 0.6;
  });

  const showLabel = node.kind === "agent" || hovered || selected;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <meshBasicMaterial color={node.color} wireframe transparent opacity={selected ? 1 : 0.85} />
      </mesh>
      {showLabel && (
        <Text
          position={[0, node.size + 0.2, 0]}
          fontSize={0.14}
          color={node.color}
          anchorX="center"
          anchorY="bottom"
          maxWidth={2.4}
        >
          {node.label}
        </Text>
      )}
    </group>
  );
}
