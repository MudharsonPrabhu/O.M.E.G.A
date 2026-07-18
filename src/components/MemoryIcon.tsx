type IconKind = "doc" | "vector" | "paper" | "code" | "graph" | "decision" | "routing";

function iconForLabel(label: string): IconKind {
  const l = label.toLowerCase();
  if (l.includes("decision")) return "decision";
  if (l.includes("routing") || l.includes("agent")) return "routing";
  if (l.includes("codebase") || l.includes("code")) return "code";
  if (l.includes("knowledge graph") || l.includes("graph")) return "graph";
  if (l.includes("vector") || l.includes("search")) return "vector";
  if (l.includes("paper") || l.includes("ingestion")) return "paper";
  return "doc";
}

const PATHS: Record<IconKind, string> = {
  doc: "M5 3h6l3 3v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 3v3h3",
  vector: "M8 3l5 2.5v5L8 13 3 10.5v-5L8 3zM8 3v10M3 5.5l5 2.5 5-2.5",
  paper: "M4 3h8l2 2v10H4V3zM6 7h6M6 9.5h6M6 12h4",
  code: "M6 5 2 9l4 4M10 5l4 4-4 4",
  graph: "M4 4a1.5 1.5 0 1 0 0-.001zM12 4a1.5 1.5 0 1 0 0-.001zM8 12a1.5 1.5 0 1 0 0-.001zM4 5.2 7 11M12 5.2 9 11",
  decision: "M8 2v8M8 10l-3-3M8 10l3-3M3 13h10",
  routing: "M3 8h6M9 8l-2.5-2.5M9 8l-2.5 2.5M13 4v8",
};

export function MemoryIcon({ label, size = 12 }: { label: string; size?: number }) {
  const kind = iconForLabel(label);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path d={PATHS[kind]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
