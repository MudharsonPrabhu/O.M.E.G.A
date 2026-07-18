import { createNoise3D } from "simplex-noise";

export function makeNoise3D(seed?: () => number) {
  return createNoise3D(seed);
}

// small mulberry32 PRNG so each layer/agent gets a stable, seeded noise field
// instead of everything sharing Math.random's global stream
export function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
