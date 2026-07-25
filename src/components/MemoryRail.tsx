import type { MemoryTouch } from "../lib/systemState";
import { TOKENS } from "../lib/moodTheme";
import { MemoryIcon } from "./MemoryIcon";

interface MemoryRailProps {
  memory: MemoryTouch[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenGraph: () => void;
}

const TYPE_COLOR: Record<MemoryTouch["type"], string> = {
  entity: TOKENS.memory,
  session: TOKENS.pulse,
  source: TOKENS.research,
};

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function MemoryRail({ memory, collapsed, onToggle, onOpenGraph }: MemoryRailProps) {
  const items = [...memory].reverse();

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="label flex h-full w-6 items-center justify-center border-l border-panel-border bg-panel/40 hover:text-text"
        title="expand memory rail"
      >
        «
      </button>
    );
  }

  return (
    <aside className="flex h-full w-72 flex-col border-l border-panel-border bg-panel/40">
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <span className="label">Memory Rail</span>
        <button onClick={onToggle} className="label hover:text-text" title="collapse">
          »
        </button>
      </div>

      <div className="rail-scroll flex-1 overflow-y-auto px-3 py-2">
        {items.length === 0 && <p className="mono px-1 py-2 text-[11px] text-text-muted">no touches yet</p>}
        {items.map((touch, i) => {
          const color = TYPE_COLOR[touch.type];
          const index = items.length - i;
          return (
            <div key={touch.id} className="flex items-start gap-2.5 py-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded"
                style={{ background: `${color}1a`, color }}
              >
                <MemoryIcon label={touch.label} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold text-text">{touch.label}</span>
                  <span className="mono shrink-0 text-[10px]" style={{ color }}>
                    [{index}]
                  </span>
                </div>
                <span className="mono block text-[10px] text-text-muted">{timeLabel(touch.timestamp)}</span>
                {touch.linkedTo.length > 0 && (
                  <span className="mono block truncate text-[10px] text-text-muted">
                    Linked to: {touch.linkedTo.join(", ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onOpenGraph}
        className="label border-t border-panel-border py-2.5 text-center hover:text-text"
      >
        view full graph ⤢
      </button>
    </aside>
  );
}
