import { useState, useEffect } from "react";
import { fetchKeyStatus, fetchHealth, fetchAuditLogs } from "../lib/api";
import { TOKENS } from "../lib/moodTheme";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<"keys" | "health" | "audit">("keys");
  const [keyData, setKeyData] = useState<any | null>(null);
  const [healthData, setHealthData] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [keys, health, audit] = await Promise.all([
        fetchKeyStatus().catch(() => null),
        fetchHealth().catch(() => null),
        fetchAuditLogs(30).catch(() => ({ audit_logs: [] })),
      ]);
      setKeyData(keys);
      setHealthData(health);
      setAuditLogs(audit?.audit_logs || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl rounded-lg border border-panel-border bg-panel p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-panel-border pb-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[14px] text-text">O.M.E.G.A Core Diagnostics</span>
            <span className="mono text-[11px] text-text-muted">// System Configuration &amp; Audit</span>
            {loading && <span className="mono text-[10px] text-signal animate-pulse">Syncing…</span>}
          </div>
          <button onClick={onClose} className="label hover:text-text text-[14px]">
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 border-b border-panel-border py-2.5">
          <button
            onClick={() => setTab("keys")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "keys" ? "bg-panel-border text-signal" : "text-text-muted hover:text-text"
            }`}
          >
            Gemini Provider Rotation ({keyData?.keys?.length || 0})
          </button>
          <button
            onClick={() => setTab("health")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "health" ? "bg-panel-border text-pulse" : "text-text-muted hover:text-text"
            }`}
          >
            Backend Health
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "audit" ? "bg-panel-border text-research" : "text-text-muted hover:text-text"
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto py-4">
          {tab === "keys" && (
            <div className="space-y-4">
              <p className="text-[12px] text-text-muted">
                Deterministic round-robin key rotation with bounded retries, cooldown tracking, and automated rate-limit recovery.
              </p>
              {keyData && keyData.keys && (
                <div className="space-y-2">
                  {keyData.keys.map((k: any) => (
                    <div
                      key={k.index}
                      className="flex items-center justify-between rounded border border-panel-border bg-void/60 px-4 py-2.5 mono text-[12px]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: k.is_healthy ? TOKENS.signal : TOKENS.alert }}
                        />
                        <span className="font-semibold text-text">Key #{k.index}</span>
                        <span className="text-text-muted">{k.masked_key}</span>
                      </div>
                      <div className="flex items-center gap-4 text-text-muted text-[11px]">
                        <span>Reqs: {k.total_requests}</span>
                        <span>Success: {k.successful_requests}</span>
                        {k.cooldown_remaining_sec > 0 && (
                          <span className="text-warning">Cooldown: {k.cooldown_remaining_sec}s</span>
                        )}
                        <span style={{ color: k.is_healthy ? TOKENS.signal : TOKENS.alert }}>
                          {k.is_healthy ? "READY" : "INACTIVE / DISABLED"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "health" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded border border-panel-border bg-void/60 p-4">
                  <span className="label block mb-1">Backend Status</span>
                  <span className="mono text-[14px] text-signal font-semibold uppercase">
                    {healthData?.status || "Unknown"}
                  </span>
                </div>
                <div className="rounded border border-panel-border bg-void/60 p-4">
                  <span className="label block mb-1">SQLite Database</span>
                  <span className="mono text-[14px] text-signal font-semibold uppercase">
                    {healthData?.database || "Unknown"}
                  </span>
                </div>
                <div className="rounded border border-panel-border bg-void/60 p-4">
                  <span className="label block mb-1">Configured Model</span>
                  <span className="mono text-[14px] text-text font-semibold">
                    {healthData?.model || "gemini-3.8-flash"}
                  </span>
                </div>
                <div className="rounded border border-panel-border bg-void/60 p-4">
                  <span className="label block mb-1">Active Gemini Keys</span>
                  <span className="mono text-[14px] text-signal font-semibold">
                    {healthData?.gemini_keys_configured || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="space-y-3">
              <p className="text-[12px] text-text-muted mb-2">
                Immutable audit trail of all executed tools, permissions, duration, and verified status.
              </p>
              {auditLogs.length === 0 && (
                <p className="mono text-[12px] text-text-muted">No tool executions recorded yet.</p>
              )}
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded border border-panel-border bg-void/60 p-3 mono text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text">{log.tool_name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded uppercase text-[10px]"
                        style={{
                          background: log.status === "completed" ? `${TOKENS.signal}20` : `${TOKENS.alert}20`,
                          color: log.status === "completed" ? TOKENS.signal : TOKENS.alert,
                        }}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-muted text-[10px]">
                      <span>Timestamp: {new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>Duration: {log.duration_ms}ms</span>
                      <span>Verified: {log.verified ? "YES" : "NO"}</span>
                    </div>
                    {log.arguments && (
                      <pre className="text-text-muted text-[10px] bg-black/20 p-1.5 rounded truncate">
                        {log.arguments}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-panel-border pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="mono rounded border border-panel-border px-4 py-1.5 text-[12px] text-text hover:bg-panel-border/50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
