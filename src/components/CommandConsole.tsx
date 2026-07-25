import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ThoughtNode } from "../lib/systemState";
import { IDLE_FREQUENCY_HZ, TOKENS } from "../lib/moodTheme";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useMicLevel } from "../hooks/useMicLevel";
import { MicIcon, SpeakerIcon } from "./VoiceIcons";
import { Waveform } from "./Waveform";

import { sendChatMessage, type ChatResult } from "../lib/api";

interface CommandConsoleProps {
  recentThoughts: ThoughtNode[];
}

export function CommandConsole({ recentThoughts }: CommandConsoleProps) {
  const [value, setValue] = useState("");
  const [queued, setQueued] = useState<string[]>([]);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [captionReply, setCaptionReply] = useState<string | null>(null);
  const [lastTools, setLastTools] = useState<ChatResult["tools_executed"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);
  const blinkDurationMs = Math.round(1000 / IDLE_FREQUENCY_HZ);

  const { speaking, speak } = useSpeechSynthesis();
  const {
    supported: sttSupported,
    listening,
    interim,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition((finalText) => submitCommand(finalText));
  const micLevels = useMicLevel(listening);

  const liveSteps = recentThoughts.slice(-6).map((t) => t.label);
  const steps = liveSteps.length > 0 || queued.length > 0 ? [...liveSteps, ...queued].slice(-8) : ["awaiting first task…"];

  useEffect(() => {
    if (tickerRef.current) tickerRef.current.scrollLeft = tickerRef.current.scrollWidth;
  }, [steps.length]);

  useEffect(() => {
    if (speaking || !captionReply) return;
    const t = setTimeout(() => setCaptionReply(null), 8000);
    return () => clearTimeout(t);
  }, [speaking, captionReply]);

  async function submitCommand(command: string) {
    const trimmed = command.trim();
    if (!trimmed || isLoading) return;

    const shortCommand = trimmed.length > 32 ? trimmed.slice(0, 32) + "…" : trimmed;
    setQueued((prev) => [...prev, `command: "${shortCommand}"`, "routing intent → orchestrator"].slice(-4));
    setIsLoading(true);

    try {
      const res = await sendChatMessage(trimmed);
      setCaptionReply(res.reply);
      setLastTools(res.tools_executed || []);

      if (res.tools_executed && res.tools_executed.length > 0) {
        const toolNames = res.tools_executed.map((t) => `${t.tool_name} (${t.duration_ms}ms)`).join(", ");
        setQueued((prev) => [...prev, `verified: [${toolNames}]`].slice(-4));
      } else {
        setQueued((prev) => [...prev, "response synthesized"].slice(-4));
      }

      if (voiceReplyEnabled) {
        // Strip markdown fences / asterisks for cleaner spoken audio
        const spokenText = res.reply.replace(/[`*#_]/g, "").slice(0, 200);
        speak(spokenText);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to execute command.";
      setCaptionReply(`Error: ${errorMsg}`);
      setQueued((prev) => [...prev, "execution error"].slice(-4));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const command = value.trim();
    if (!command || isLoading) return;
    setValue("");
    submitCommand(command);
  }

  const showingCaption = listening || speaking || Boolean(captionReply);

  return (
    <div className="border-t border-panel-border bg-panel/70 backdrop-blur-sm">
      <div className="border-b border-panel-border px-4 pt-2.5">
        <span className="label">
          Thought Trace <span className="text-text-muted/70">// Live Reasoning Stream</span>
        </span>
        <div
          ref={tickerRef}
          className="rail-scroll mono flex items-center gap-2 overflow-x-auto py-2 text-[11px] whitespace-nowrap text-text"
        >
          {steps.map((step, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2">
              {i > 0 && <span className="text-text-muted">›</span>}
              <span>{step}</span>
            </span>
          ))}
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ background: TOKENS.signal }} />
        </div>
      </div>

      {showingCaption && (
        <div className="flex items-center gap-3 border-b border-panel-border px-4 py-2.5">
          {listening ? (
            <>
              <Waveform values={micLevels} color={TOKENS.alert} width={56} height={16} />
              <span className="mono text-[13px] text-text">
                <span className="text-text-muted">you:</span> {interim || "listening…"}
              </span>
            </>
          ) : (
            <>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse"
                style={{ background: TOKENS.pulse }}
              />
              <div className="flex flex-col gap-1">
                <span className="mono text-[13px]" style={{ color: TOKENS.pulse }}>
                  <span className="text-text-muted">omega:</span> {captionReply}
                </span>
                {lastTools.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {lastTools.map((t, idx) => (
                      <span
                        key={idx}
                        className="mono text-[10px] px-2 py-0.5 rounded border border-signal/40 text-signal bg-signal/10 flex items-center gap-1"
                      >
                        <span className="text-signal">✓</span> {t.tool_name} ({t.duration_ms}ms)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3">
        <span className="mono text-[13px]" style={{ color: TOKENS.signal }}>
          &gt;
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="issue a command…"
          className="mono flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted focus:outline-none"
          autoFocus
        />
        <span
          className="mono h-4 w-[7px]"
          style={{
            background: TOKENS.signal,
            animation: `caret-blink ${blinkDurationMs}ms steps(1) infinite`,
          }}
        />
        <button
          type="button"
          onClick={() => setVoiceReplyEnabled((v) => !v)}
          title={voiceReplyEnabled ? "mute voice replies" : "unmute voice replies"}
          className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
          style={{ color: voiceReplyEnabled ? TOKENS.pulse : TOKENS.textMuted }}
        >
          <SpeakerIcon />
        </button>
        <button
          type="button"
          onClick={() => (listening ? stopListening() : startListening())}
          disabled={!sttSupported}
          title={
            !sttSupported
              ? "voice input not supported in this browser"
              : listening
                ? "stop listening"
                : "voice command"
          }
          className="relative flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            borderColor: listening ? TOKENS.alert : TOKENS.panelBorder,
            color: listening ? TOKENS.alert : TOKENS.textMuted,
          }}
        >
          {listening && (
            <span
              className="absolute inset-0 animate-ping rounded-full"
              style={{ background: `${TOKENS.alert}33` }}
            />
          )}
          <MicIcon />
        </button>
      </form>
    </div>
  );
}
