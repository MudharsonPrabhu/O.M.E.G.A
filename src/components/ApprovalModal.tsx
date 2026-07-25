import { useState } from "react";
import { approvePendingAction, rejectPendingAction } from "../lib/api";

interface ApprovalModalProps {
  approvals: any[];
  onResolved: (actionId: string) => void;
}

export function ApprovalModal({ approvals, onResolved }: ApprovalModalProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (!approvals || approvals.length === 0) return null;
  const current = approvals[0];

  async function handleApprove() {
    setSubmitting(current.action_id);
    try {
      await approvePendingAction(current.action_id);
    } finally {
      setSubmitting(null);
      onResolved(current.action_id);
    }
  }

  async function handleReject() {
    setSubmitting(current.action_id);
    try {
      await rejectPendingAction(current.action_id);
    } finally {
      setSubmitting(null);
      onResolved(current.action_id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-lg border border-alert/50 bg-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-panel-border pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-alert animate-ping" />
            <span className="mono text-[13px] font-bold uppercase tracking-wider text-alert">
              Security Authorization Required
            </span>
          </div>
          <span className="mono text-[11px] rounded bg-alert/20 px-2 py-0.5 text-alert uppercase">
            {current.category || "Destructive"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-[14px] text-text">
            O.M.E.G.A is requesting permission to execute an OS operation:
          </p>

          <div className="rounded border border-panel-border bg-void/60 p-3 mono text-[12px]">
            <div className="flex justify-between text-text-muted mb-1">
              <span>TOOL:</span>
              <span className="text-signal font-semibold">{current.tool_name}</span>
            </div>
            <div className="text-text-muted mb-1">ARGUMENTS:</div>
            <pre className="overflow-x-auto text-text/90 text-[11px] bg-black/30 p-2 rounded max-h-36">
              {JSON.stringify(current.arguments, null, 2)}
            </pre>
          </div>

          {current.description && (
            <p className="mono text-[11px] text-text-muted italic">
              {current.description}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-panel-border pt-4">
          <button
            onClick={handleReject}
            disabled={submitting !== null}
            className="mono rounded border border-panel-border px-4 py-2 text-[12px] uppercase text-text hover:bg-white/5 transition-colors"
          >
            Reject Action
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting !== null}
            className="mono rounded bg-alert/90 hover:bg-alert px-5 py-2 text-[12px] font-semibold uppercase text-black transition-colors"
          >
            {submitting ? "Processing…" : "Authorize & Execute"}
          </button>
        </div>
      </div>
    </div>
  );
}
