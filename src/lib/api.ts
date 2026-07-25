/**
 * O.M.E.G.A — Frontend REST and WebSocket API Client
 */

const API_BASE = "http://localhost:8000/api";
export const WS_BASE = "ws://localhost:8000/api/events";

export interface ChatResult {
  task_id: string;
  reply: string;
  tools_executed: Array<{
    tool_name: string;
    status: string;
    result?: any;
    error?: string;
    duration_ms: number;
    verified: boolean;
    required_approval?: boolean;
  }>;
  duration_ms: number;
}

export async function sendChatMessage(message: string): Promise<ChatResult> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to communicate with OMEGA backend.");
  }
  return res.json();
}

export async function fetchSystemTelemetry() {
  const res = await fetch(`${API_BASE}/system/telemetry`);
  if (!res.ok) throw new Error("Failed to fetch telemetry.");
  return res.json();
}

export async function fetchKnowledgeGraph(query?: string) {
  const url = query ? `${API_BASE}/graph/search?q=${encodeURIComponent(query)}` : `${API_BASE}/graph`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch knowledge graph.");
  return res.json();
}

export async function fetchMemories() {
  const res = await fetch(`${API_BASE}/memory`);
  if (!res.ok) throw new Error("Failed to fetch memories.");
  return res.json();
}

export async function saveNewMemory(title: string, content: string, category = "note", tags: string[] = []) {
  const res = await fetch(`${API_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, category, tags }),
  });
  if (!res.ok) throw new Error("Failed to save memory.");
  return res.json();
}

export async function deleteMemoryItem(memoryId: number) {
  const res = await fetch(`${API_BASE}/memory/${memoryId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete memory.");
  return res.json();
}

export async function fetchStudyDocuments() {
  const res = await fetch(`${API_BASE}/study/documents`);
  if (!res.ok) throw new Error("Failed to fetch study documents.");
  return res.json();
}

export async function uploadStudyDoc(file: File, subject: string, title?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("subject", subject);
  if (title) formData.append("title", title);

  const res = await fetch(`${API_BASE}/study/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed." }));
    throw new Error(err.detail || "Upload failed.");
  }
  return res.json();
}

export async function askStudyQuestion(question: string, subject?: string) {
  const res = await fetch(`${API_BASE}/study/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, subject }),
  });
  if (!res.ok) throw new Error("Failed to query study material.");
  return res.json();
}

export async function generateStudyQuiz(subject: string, topic: string, count = 3) {
  const res = await fetch(`${API_BASE}/study/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, topic, count }),
  });
  if (!res.ok) throw new Error("Failed to generate quiz.");
  return res.json();
}

export async function recordQuizResult(
  subject: string,
  topic: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
  explanation: string
) {
  const res = await fetch(`${API_BASE}/study/quiz/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      topic,
      question,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      explanation,
    }),
  });
  if (!res.ok) throw new Error("Failed to record quiz answer.");
  return res.json();
}

export async function fetchStudyAnalytics() {
  const res = await fetch(`${API_BASE}/study/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics.");
  return res.json();
}

export async function fetchPendingApprovals() {
  const res = await fetch(`${API_BASE}/actions/pending`);
  if (!res.ok) return { pending: [] };
  return res.json();
}

export async function approvePendingAction(actionId: string) {
  const res = await fetch(`${API_BASE}/actions/${actionId}/approve`, { method: "POST" });
  return res.json();
}

export async function rejectPendingAction(actionId: string) {
  const res = await fetch(`${API_BASE}/actions/${actionId}/reject`, { method: "POST" });
  return res.json();
}

export async function fetchAuditLogs(limit = 40) {
  const res = await fetch(`${API_BASE}/actions/audit?limit=${limit}`);
  if (!res.ok) return { audit_logs: [] };
  return res.json();
}

export async function fetchKeyStatus() {
  const res = await fetch(`${API_BASE}/settings/keys`);
  if (!res.ok) throw new Error("Failed to fetch key status.");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/settings/health`);
  if (!res.ok) throw new Error("Failed to fetch health.");
  return res.json();
}
