import { useEffect, useRef, useState } from "react";

// live microphone amplitude, sampled while `active` — feeds the same
// Waveform component used for agent activity, so the mic reads as one more
// instrument on the panel rather than a bespoke widget.
export function useMicLevel(active: boolean, length = 24): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(length).fill(0.05));
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) {
      setLevels(Array(length).fill(0.05));
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const interval = setInterval(() => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevels((prev) => [...prev.slice(-(length - 1)), Math.min(1, rms * 4)]);
        }, 60);

        cleanupRef.current = () => {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
        };
      })
      .catch(() => {
        // mic permission denied/unavailable — captions still work off STT alone
      });

    return () => {
      cancelled = true;
      cleanupRef.current();
      cleanupRef.current = () => {};
    };
  }, [active, length]);

  return levels;
}
