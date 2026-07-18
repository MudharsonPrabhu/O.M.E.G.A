import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "../../lib/noise";

interface AmbientDustProps {
  count?: number;
  color: string;
  animate?: boolean;
}

export function AmbientDust({ count = 90, color, animate = true }: AmbientDustProps) {
  const groupRef = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const rand = seededRandom(707);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.7 + rand() * 1.1;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      arr[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      arr[i * 3 + 1] = Math.cos(phi) * radius;
      arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    return arr;
  }, [count]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.02,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  material.color.set(color);

  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material]);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.y += Math.min(delta, 1 / 30) * 0.015;
  });

  return (
    <group ref={groupRef}>
      <primitive object={points} />
    </group>
  );
}
