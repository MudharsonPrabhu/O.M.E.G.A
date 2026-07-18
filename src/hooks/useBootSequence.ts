import { useEffect, useState } from "react";

export type BootPhase = "void" | "core" | "strip" | "done";

const PHASE_TIMING: Array<{ phase: BootPhase; at: number }> = [
  { phase: "void", at: 0 },
  { phase: "core", at: 150 },
  { phase: "strip", at: 1350 },
  { phase: "done", at: 2000 },
];

export function useBootSequence(skip: boolean) {
  const [phase, setPhase] = useState<BootPhase>(skip ? "done" : "void");

  useEffect(() => {
    if (skip) return;
    const timers = PHASE_TIMING.map(({ phase: p, at }) => setTimeout(() => setPhase(p), at));
    return () => timers.forEach(clearTimeout);
  }, [skip]);

  return { phase, booted: phase === "done" };
}
