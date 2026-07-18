import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "../../lib/noise";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ParticleTrailsProps {
  count?: number;
  radius: number;
  color: string;
  /** 0-1, how active the emitter is — trails fade out toward 0 */
  intensity: number;
  animate?: boolean;
}

export function ParticleTrails({ count = 70, radius, color, intensity, animate = true }: ParticleTrailsProps) {
  const rand = useMemo(() => seededRandom(4242), []);

  const particles = useMemo<Particle[]>(() => {
    const rnd = seededRandom(99);
    return Array.from({ length: count }, () => makeParticle(radius, rnd, 0));
  }, [count, radius]);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.035,
        transparent: true,
        opacity: 0,
        sizeAttenuation: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const pointsObject = useMemo(() => new THREE.Points(geometry, material), [geometry, material]);

  useFrame((_, delta) => {
    if (!animate) return;
    const dt = Math.min(delta, 1 / 30);
    material.opacity = THREE.MathUtils.lerp(material.opacity, intensity * 0.85, 0.08);
    material.color.set(color);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife || intensity < 0.05) {
        Object.assign(p, makeParticle(radius, rand, intensity < 0.05 ? 0 : rand()));
      }
      p.pos.addScaledVector(p.vel, dt);
      positions[i * 3] = p.pos.x;
      positions[i * 3 + 1] = p.pos.y;
      positions[i * 3 + 2] = p.pos.z;
    }

    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
  });

  return <primitive object={pointsObject} />;
}

function makeParticle(radius: number, rnd: () => number, startProgress: number): Particle {
  const theta = rnd() * Math.PI * 2;
  const phi = Math.acos(2 * rnd() - 1);
  const origin = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).multiplyScalar(radius);

  // tangential direction: cross the radial vector with an arbitrary up vector
  const radial = origin.clone().normalize();
  const arbitrary = Math.abs(radial.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(radial, arbitrary).normalize();

  const maxLife = 0.8 + rnd() * 1.2;
  return {
    pos: origin.addScaledVector(tangent, startProgress * 0.4),
    vel: tangent.multiplyScalar(0.35 + rnd() * 0.25),
    life: startProgress * maxLife,
    maxLife,
  };
}
