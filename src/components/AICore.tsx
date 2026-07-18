import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { SystemState } from "../lib/systemState";
import { MOOD_COLOR, TOKENS } from "../lib/moodTheme";
import { CoreLayer } from "./core/CoreLayer";
import { ParticleTrails } from "./core/ParticleTrails";
import { CoreRing } from "./core/CoreRing";
import { AmbientDust } from "./core/AmbientDust";

export interface AICoreProps {
  state: SystemState;
  reducedMotion: boolean;
}

export function averageConfidence(state: SystemState): number {
  const values: number[] = [];
  for (const a of state.agents) if (a.status === "active") values.push(a.confidence);
  for (const t of state.thoughts.slice(-6)) if (t.status === "exploring") values.push(t.confidence);
  if (values.length === 0) return 0.85;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function agentActivity(state: SystemState): number {
  if (state.agents.length === 0) return 0;
  const latest = state.agents.map((a) => a.waveform[a.waveform.length - 1] ?? 0);
  return latest.reduce((s, v) => s + v, 0) / latest.length;
}

function Scene({ state, reducedMotion }: AICoreProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevMoodRef = useRef(state.coreMood);
  const spikeRef = useRef(0);
  const smoothedInnerAmp = useRef(0.15);
  const bootStartRef = useRef(performance.now());

  const color = MOOD_COLOR[state.coreMood];
  const confidence = useMemo(() => averageConfidence(state), [state]);
  const activity = useMemo(() => agentActivity(state), [state]);

  if (state.coreMood === "error" && prevMoodRef.current !== "error") {
    spikeRef.current = 1;
  }
  prevMoodRef.current = state.coreMood;

  // reasoning (coreAmplitude) is the primary driver of the outer mesh, with a
  // small boost from live agent activity so a busy roster reads as more energy
  const outerAmplitude = Math.min(1, state.coreAmplitude * 0.85 + activity * 0.2);
  const innerTargetAmp = 0.08 + (state.telemetry.ramGb / 12) * 0.35 + (state.telemetry.tasksActive / 6) * 0.25;

  useFrame((_, delta) => {
    const dt = reducedMotion ? 0 : Math.min(delta, 1 / 30);

    // transient spike decays quickly on error onset
    spikeRef.current = Math.max(0, spikeRef.current - dt * 1.8);

    // inner echo layer (memory/telemetry) drifts over tens of seconds, near-static
    smoothedInnerAmp.current += (innerTargetAmp - smoothedInnerAmp.current) * dt * 0.05;

    if (groupRef.current) {
      if (!reducedMotion) {
        groupRef.current.rotation.y += dt * 0.045;
        groupRef.current.rotation.x = Math.sin(performance.now() * 0.00005) * 0.08;
      }

      // materialize from a single point into the full mesh on first mount —
      // animated on the Three.js object, never via a CSS transform on the
      // canvas's DOM ancestors (that desyncs R3F's size observer permanently)
      const bootElapsed = reducedMotion ? 1 : (performance.now() - bootStartRef.current) / 1000;
      const bootT = THREE.MathUtils.clamp(bootElapsed / 1.2, 0, 1);
      const eased = 1 - Math.pow(1 - bootT, 3);
      groupRef.current.scale.setScalar(Math.max(0.02, eased));
    }
  });

  const arrhythmia = state.coreMood === "error";
  const particleIntensity = state.coreMood === "coding" ? Math.min(1, 0.4 + activity) : 0;

  return (
    <group ref={groupRef}>
      <CoreLayer
        radius={1.15}
        seed={11}
        color={color}
        opacity={0.95}
        amplitude={outerAmplitude}
        frequency={state.coreFrequency}
        confidence={confidence}
        spike={spikeRef.current}
        arrhythmia={arrhythmia}
        animate={!reducedMotion}
        latSegments={22}
        lonSegments={34}
      />
      <CoreLayer
        radius={0.85}
        seed={97}
        color={TOKENS.memory}
        opacity={0.16}
        amplitude={smoothedInnerAmp.current}
        frequency={0.06}
        confidence={1}
        animate={!reducedMotion}
        latSegments={10}
        lonSegments={16}
      />
      <CoreRing radius={1.55} color={color} animate={!reducedMotion} />
      <AmbientDust color={color} animate={!reducedMotion} />
      <ParticleTrails radius={1.15} color={color} intensity={particleIntensity} animate={!reducedMotion} />
    </group>
  );
}

export function AICore({ state, reducedMotion }: AICoreProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene state={state} reducedMotion={reducedMotion} />
        {!reducedMotion && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.35} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur radius={0.35} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
