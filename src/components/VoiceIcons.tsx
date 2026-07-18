export function MicIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <rect x="6" y="2" width="4" height="7" rx="2" />
      <path d="M4 7.5a4 4 0 0 0 8 0M8 11.5v2.5M6 14h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeakerIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path
        d="M2 6h2.5L8 3.3v9.4L4.5 10H2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.8 5.5a3.5 3.5 0 0 1 0 5M12.6 3.7a6 6 0 0 1 0 8.6" strokeLinecap="round" />
    </svg>
  );
}
