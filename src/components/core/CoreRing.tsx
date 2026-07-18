import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CoreRingProps {
  radius: number;
  color: string;
  animate?: boolean;
}

const SEGMENTS = 96;

export function CoreRing({ radius, color, animate = true }: CoreRingProps) {
  const groupRef = useRef<THREE.Group>(null);

  // drawn facing the camera (XY plane); the group's rotation below tilts it
  // into the classic "Saturn ring" ellipse instead of an edge-on line
  const positions = useMemo(() => {
    const arr = new Float32Array(SEGMENTS * 3);
    for (let i = 0; i < SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      arr[i * 3] = Math.cos(theta) * radius;
      arr[i * 3 + 1] = Math.sin(theta) * radius;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, [radius]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  material.color.set(color);

  const loop = useMemo(() => new THREE.LineLoop(geometry, material), [geometry, material]);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.z += Math.min(delta, 1 / 30) * 0.06;
  });

  return (
    <group ref={groupRef} rotation={[1.35, 0.3, 0.15]}>
      <primitive object={loop} />
    </group>
  );
}
