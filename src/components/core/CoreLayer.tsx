import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeNoise3D, seededRandom } from "../../lib/noise";

// a lat/long wireframe grid (like a globe, not a triangulated sphere — no
// diagonal edges) so the deformed Core reads as a woven mesh instead of a
// tangled single-stroke scribble. Poles are excluded from the horizontal
// rings since they collapse to a point.
function buildGrid(latSegments: number, lonSegments: number) {
  const rows = latSegments + 1;
  const cols = lonSegments;
  const base = new Float32Array(rows * cols * 3);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = Math.cos(Math.PI * v);
    const radiusAtY = Math.sin(Math.PI * v);
    for (let c = 0; c < cols; c++) {
      const theta = (c / cols) * Math.PI * 2;
      const idx = (r * cols + c) * 3;
      base[idx] = Math.cos(theta) * radiusAtY;
      base[idx + 1] = y;
      base[idx + 2] = Math.sin(theta) * radiusAtY;
    }
  }

  const segments: [number, number][] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      segments.push([r * cols + c, r * cols + ((c + 1) % cols)]);
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 1; r++) {
      segments.push([r * cols + c, (r + 1) * cols + c]);
    }
  }

  return { base, segments, rows, cols };
}

export interface CoreLayerProps {
  latSegments?: number;
  lonSegments?: number;
  radius: number;
  seed: number;
  color: string;
  opacity: number;
  /** 0-1, overall deformation strength for this layer */
  amplitude: number;
  /** roughly 0.05-3, deformation speed in Hz */
  frequency: number;
  /** 0-1, coherence of motion across points — 1 = perfectly in sync, 0 = chaotic/async */
  confidence: number;
  /** extra transient amplitude spike (0-1), used for error-state onset */
  spike?: number;
  /** irregular timing multiplier — used to give the error mood an "arrhythmia" feel */
  arrhythmia?: boolean;
  /** false freezes the layer after its first render (reduced-motion mode) */
  animate?: boolean;
}

export function CoreLayer({
  latSegments = 22,
  lonSegments = 34,
  radius,
  seed,
  color,
  opacity,
  amplitude,
  frequency,
  confidence,
  spike = 0,
  arrhythmia = false,
  animate = true,
}: CoreLayerProps) {
  const frozenRef = useRef(false);
  const clockRef = useRef(0);
  const arrhythmiaPhaseRef = useRef(0);

  const { base, segments, rows, cols } = useMemo(() => buildGrid(latSegments, lonSegments), [latSegments, lonSegments]);
  const vertexCount = rows * cols;
  const noise = useMemo(() => makeNoise3D(seededRandom(seed)), [seed]);
  const noise2 = useMemo(() => makeNoise3D(seededRandom(seed + 977)), [seed]);
  const phaseOffsets = useMemo(() => {
    const rand = seededRandom(seed + 31);
    const arr = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) arr[i] = (rand() - 0.5) * 2 * Math.PI * 3;
    return arr;
  }, [vertexCount, seed]);

  // per-vertex displaced positions (recomputed each frame)
  const displaced = useMemo(() => new Float32Array(vertexCount * 3), [vertexCount]);
  // segment endpoint buffers fed to the LineSegments geometry
  const positions = useMemo(() => new Float32Array(segments.length * 2 * 3), [segments.length]);
  const colors = useMemo(() => new Float32Array(segments.length * 2 * 3), [segments.length]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [positions, colors]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const lineObject = useMemo(() => new THREE.LineSegments(geometry, material), [geometry, material]);

  const baseColor = useRef(new THREE.Color(color));
  const dimColor = useRef(new THREE.Color());
  const brightColor = useRef(new THREE.Color());

  useFrame((_, delta) => {
    if (!animate && frozenRef.current) return;
    frozenRef.current = true;
    const dt = animate ? Math.min(delta, 1 / 30) : 0;

    if (arrhythmia) {
      const wobble = 1 + 0.6 * noise2(clockRef.current * 0.4, 0, 0);
      arrhythmiaPhaseRef.current += dt * frequency * wobble;
    }
    clockRef.current += dt;

    const t = arrhythmia ? arrhythmiaPhaseRef.current : clockRef.current * frequency;
    const chaos = 1 - confidence;
    const amp = Math.min(1, amplitude + spike) * 0.22;

    baseColor.current.set(color);
    dimColor.current.copy(baseColor.current).multiplyScalar(0.45);
    brightColor.current.copy(baseColor.current).lerp(new THREE.Color("#ffffff"), 0.5);

    for (let i = 0; i < vertexCount; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];

      const localT = t + phaseOffsets[i] * chaos;
      const n = noise(bx * 1.1 + localT * 0.6, by * 1.1 + localT * 0.6, bz * 1.1);
      const r = radius * (1 + n * amp);

      displaced[i * 3] = bx * r;
      displaced[i * 3 + 1] = by * r;
      displaced[i * 3 + 2] = bz * r;
    }

    for (let s = 0; s < segments.length; s++) {
      const [a, b] = segments[s];
      const o = s * 6;
      positions[o] = displaced[a * 3];
      positions[o + 1] = displaced[a * 3 + 1];
      positions[o + 2] = displaced[a * 3 + 2];
      positions[o + 3] = displaced[b * 3];
      positions[o + 4] = displaced[b * 3 + 1];
      positions[o + 5] = displaced[b * 3 + 2];

      // vertical gradient: brighter near the top, dimmer toward the bottom —
      // gives the mesh depth instead of a flat single-tone wireframe
      const ta = (base[a * 3 + 1] + 1) / 2;
      const tb = (base[b * 3 + 1] + 1) / 2;
      const co = s * 6;
      colors[co] = THREE.MathUtils.lerp(dimColor.current.r, brightColor.current.r, ta);
      colors[co + 1] = THREE.MathUtils.lerp(dimColor.current.g, brightColor.current.g, ta);
      colors[co + 2] = THREE.MathUtils.lerp(dimColor.current.b, brightColor.current.b, ta);
      colors[co + 3] = THREE.MathUtils.lerp(dimColor.current.r, brightColor.current.r, tb);
      colors[co + 4] = THREE.MathUtils.lerp(dimColor.current.g, brightColor.current.g, tb);
      colors[co + 5] = THREE.MathUtils.lerp(dimColor.current.b, brightColor.current.b, tb);
    }

    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    geometry.computeBoundingSphere();
    material.opacity = opacity;
  });

  return <primitive object={lineObject} />;
}
