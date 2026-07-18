interface WaveformProps {
  values: number[];
  color: string;
  height?: number;
  width?: number;
}

export function Waveform({ values, color, height = 20, width = 72 }: WaveformProps) {
  if (values.length < 2) return <svg width={width} height={height} />;

  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - v * height).toFixed(2)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
