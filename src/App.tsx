import { useEffect, useRef, useState } from "react";
import { useLiveSystemState } from "./lib/systemState";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { useBootSequence } from "./hooks/useBootSequence";
import { playSonarPing } from "./lib/sound";
import { CorePanel } from "./components/CorePanel";
import { StatusStrip } from "./components/StatusStrip";
import { AgentRail } from "./components/AgentRail";
import { MemoryRail } from "./components/MemoryRail";
import { CommandConsole } from "./components/CommandConsole";
import { NeuralGraphPage } from "./components/NeuralGraphPage";
import { StudyPanel } from "./components/StudyPanel";
import { ApprovalModal } from "./components/ApprovalModal";
import { SettingsModal } from "./components/SettingsModal";

const LIGHTING_BY_MOOD: Record<string, { brightness: number; tint: string }> = {
  idle: { brightness: 1, tint: "transparent" },
  thinking: { brightness: 1.03, tint: "rgba(124,156,255,0.05)" },
  coding: { brightness: 1.05, tint: "rgba(59,130,246,0.06)" },
  error: { brightness: 0.95, tint: "rgba(251,93,107,0.08)" },
};

function App() {
  const { state, connected, pendingApprovals, clearApproval } = useLiveSystemState();
  const osReducedMotion = useReducedMotion();
  const [manualReducedMotion, setManualReducedMotion] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [agentRailCollapsed, setAgentRailCollapsed] = useState(false);
  const [memoryRailCollapsed, setMemoryRailCollapsed] = useState(false);
  const [view, setView] = useState<"console" | "graph" | "study">("console");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reducedMotion = osReducedMotion || manualReducedMotion;

  const { phase, booted } = useBootSequence(reducedMotion);
  const prevMoodRef = useRef(state.coreMood);
  const lighting = LIGHTING_BY_MOOD[state.coreMood];

  useEffect(() => {
    if (!soundOn || !booted) {
      prevMoodRef.current = state.coreMood;
      return;
    }
    if (prevMoodRef.current === "idle" && state.coreMood !== "idle") {
      const active = state.agents.find((a) => a.status === "active" || a.status === "error");
      playSonarPing(active?.type ?? null);
    }
    prevMoodRef.current = state.coreMood;
  }, [state.coreMood, soundOn, booted, state.agents]);

  const borderTint = state.coreMood === "error" && booted ? "rgba(251,93,107,0.4)" : undefined;

  if (view === "graph") {
    return <NeuralGraphPage state={state} onBack={() => setView("console")} />;
  }

  if (view === "study") {
    return <StudyPanel onBack={() => setView("console")} />;
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-void transition-[filter] duration-500 ease-out"
      style={{
        filter: `brightness(${lighting.brightness})`,
        ["--panel-border-live" as string]: borderTint,
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-50 transition-colors duration-500 ease-out"
        style={{ background: lighting.tint }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-void transition-opacity ease-out"
        style={{
          opacity: phase === "void" ? 1 : 0,
          transitionDuration: phase === "void" ? "0ms" : "500ms",
        }}
      />

      {/* Security Approval Modal */}
      {pendingApprovals.length > 0 && (
        <ApprovalModal
          approvals={pendingApprovals}
          onResolved={(actionId) => clearApproval(actionId)}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      <div className="contents">
        <StatusStrip
          telemetry={state.telemetry}
          agents={state.agents}
          phase={phase}
          activeView={view}
          onSelectView={(v) => setView(v)}
          onOpenSettings={() => setSettingsOpen(true)}
          connected={connected}
        />

        <div className="flex min-h-0 flex-1">
          <div
            className="transition-opacity duration-700"
            style={{ opacity: phase === "void" ? 0 : 1 }}
          >
            <AgentRail
              agents={state.agents}
              telemetry={state.telemetry}
              collapsed={agentRailCollapsed}
              onToggle={() => setAgentRailCollapsed((c) => !c)}
            />
          </div>

          <main className="relative min-w-0 flex-1">
            <div
              className="absolute inset-0 transition-opacity ease-out"
              style={{
                opacity: phase === "void" ? 0 : 1,
                transitionDuration: phase === "void" ? "0ms" : "800ms",
              }}
            >
              <CorePanel
                state={state}
                reducedMotion={reducedMotion}
                motionOn={!manualReducedMotion}
                onToggleMotion={() => setManualReducedMotion((v) => !v)}
                soundOn={soundOn}
                onToggleSound={() => setSoundOn((v) => !v)}
              />
            </div>
          </main>

          <div
            className="transition-opacity duration-700"
            style={{ opacity: phase === "void" ? 0 : 1 }}
          >
            <MemoryRail
              memory={state.memory}
              collapsed={memoryRailCollapsed}
              onToggle={() => setMemoryRailCollapsed((c) => !c)}
              onOpenGraph={() => setView("graph")}
            />
          </div>
        </div>

        <div
          className="transition-opacity duration-700"
          style={{ opacity: phase === "void" || phase === "core" ? 0 : 1 }}
        >
          <CommandConsole recentThoughts={state.thoughts} />
        </div>
      </div>
    </div>
  );
}

export default App;
