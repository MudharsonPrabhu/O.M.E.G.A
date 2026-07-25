import { useState, useEffect, type FormEvent } from "react";
import {
  fetchStudyDocuments,
  uploadStudyDoc,
  askStudyQuestion,
  generateStudyQuiz,
  recordQuizResult,
  fetchStudyAnalytics,
} from "../lib/api";
import { TOKENS } from "../lib/moodTheme";

interface StudyPanelProps {
  onBack: () => void;
}

export function StudyPanel({ onBack }: StudyPanelProps) {
  const [tab, setTab] = useState<"library" | "ask" | "quiz">("library");

  // Library state
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("Operating Systems");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Ask state
  const [question, setQuestion] = useState("");
  const [askSubject, setAskSubject] = useState("");
  const [askResult, setAskResult] = useState<any | null>(null);
  const [asking, setAsking] = useState(false);

  // Quiz state
  const [quizSubject, setQuizSubject] = useState("Operating Systems");
  const [quizTopic, setQuizTopic] = useState("Process Scheduling");
  const [quizData, setQuizData] = useState<any | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, any>>({});
  const [analytics, setAnalytics] = useState<any | null>(null);

  useEffect(() => {
    loadDocuments();
    loadAnalytics();
  }, []);

  async function loadDocuments() {
    setLoadingDocs(true);
    try {
      const data = await fetchStudyDocuments();
      setDocs(data.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function loadAnalytics() {
    try {
      const data = await fetchStudyAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadStatus("Ingesting document and extracting chunks…");
    try {
      await uploadStudyDoc(selectedFile, uploadSubject, uploadTitle || undefined);
      setUploadStatus("Successfully indexed into study library!");
      setSelectedFile(null);
      setUploadTitle("");
      await loadDocuments();
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    }
  }

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setAskResult(null);
    try {
      const res = await askStudyQuestion(question, askSubject || undefined);
      setAskResult(res);
    } catch (err: any) {
      setAskResult({ error: err.message });
    } finally {
      setAsking(false);
    }
  }

  async function handleGenerateQuiz() {
    setGeneratingQuiz(true);
    setQuizData(null);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    try {
      const res = await generateStudyQuiz(quizSubject, quizTopic, 3);
      if (res.quiz && res.quiz.questions) {
        setQuizData(res.quiz);
      }
    } catch (e: any) {
      alert(`Quiz generation failed: ${e.message}`);
    } finally {
      setGeneratingQuiz(false);
    }
  }

  async function handleSubmitQuizAnswer(qIndex: number, q: any) {
    const userAns = selectedAnswers[qIndex];
    if (!userAns) return;

    try {
      const res = await recordQuizResult(
        quizSubject,
        quizTopic,
        q.question,
        userAns,
        q.correct_answer,
        q.explanation
      );
      setSubmittedAnswers((prev) => ({
        ...prev,
        [qIndex]: res,
      }));
      await loadAnalytics();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void">
      {/* Top Header */}
      <div className="flex h-11 items-center justify-between border-b border-panel-border bg-panel/60 px-4">
        <button onClick={onBack} className="label flex items-center gap-2 hover:text-text">
          <span>‹</span> back to cockpit
        </button>
        <div className="flex items-center gap-3">
          <span className="label tracking-[0.1em] text-text">
            Personal Study Assistant <span className="text-text-muted">// Knowledge Library &amp; Exam Prep</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("library")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "library" ? "bg-panel border border-signal text-signal" : "text-text-muted hover:text-text"
            }`}
          >
            Library ({docs.length})
          </button>
          <button
            onClick={() => setTab("ask")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "ask" ? "bg-panel border border-pulse text-pulse" : "text-text-muted hover:text-text"
            }`}
          >
            Ask Questions
          </button>
          <button
            onClick={() => setTab("quiz")}
            className={`mono text-[11px] px-3 py-1 rounded transition-colors ${
              tab === "quiz" ? "bg-panel border border-research text-research" : "text-text-muted hover:text-text"
            }`}
          >
            Quizzes &amp; Tests
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        {/* Tab 1: Library */}
        {tab === "library" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded border border-panel-border bg-panel/70 p-5 backdrop-blur-sm">
              <span className="label block mb-3 text-signal">Import Educational Materials</span>
              <p className="text-[12px] text-text-muted mb-4">
                Ingest PDF textbooks, lecture notes, or markdown files with automatic chunking and citation tracking.
              </p>
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="label block mb-1">Subject</label>
                  <input
                    type="text"
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    placeholder="e.g. Operating Systems, DSA"
                    className="mono w-full rounded border border-panel-border bg-void px-3 py-1.5 text-[12px] text-text focus:outline-none focus:border-signal"
                    required
                  />
                </div>
                <div>
                  <label className="label block mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Silberschatz Chapter 5"
                    className="mono w-full rounded border border-panel-border bg-void px-3 py-1.5 text-[12px] text-text focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="label block mb-1">File (PDF, MD, TXT)</label>
                  <input
                    type="file"
                    accept=".pdf,.md,.txt,.py,.ts"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mono text-[11px] text-text-muted w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-panel-border file:text-text cursor-pointer"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedFile}
                  className="mono w-full rounded bg-signal/20 hover:bg-signal/30 text-signal border border-signal/40 py-2 text-[12px] uppercase font-semibold transition-colors mt-2"
                >
                  Upload &amp; Index Chunks
                </button>
              </form>
              {uploadStatus && (
                <p className="mono mt-3 text-[11px] text-signal/90 bg-signal/10 p-2 rounded border border-signal/30">
                  {uploadStatus}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-3">
              <span className="label block text-text">Imported Study Library</span>
              {loadingDocs && <p className="mono text-[12px] text-text-muted">Loading documents…</p>}
              {docs.length === 0 && !loadingDocs && (
                <div className="rounded border border-dashed border-panel-border p-8 text-center text-text-muted mono text-[12px]">
                  No study documents uploaded yet. Upload a PDF textbook or markdown lecture note to begin.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docs.map((doc) => (
                  <div key={doc.id} className="rounded border border-panel-border bg-panel/50 p-4 hover:border-signal/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[13px] text-text">{doc.title}</span>
                      <span className="mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-text-muted">
                        {doc.file_type}
                      </span>
                    </div>
                    <span className="mono text-[11px] text-signal block mt-1">{doc.subject}</span>
                    <div className="mt-3 flex items-center justify-between text-[11px] mono text-text-muted border-t border-panel-border pt-2">
                      <span>{doc.total_pages} {doc.total_pages === 1 ? "page" : "pages"}</span>
                      <span>{doc.chunk_count} passages indexed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ask Questions */}
        {tab === "ask" && (
          <div className="space-y-6">
            <div className="rounded border border-panel-border bg-panel/70 p-5 backdrop-blur-sm">
              <span className="label block mb-2 text-pulse">Ask Your Study Notes</span>
              <p className="text-[12px] text-text-muted mb-4">
                Ask any computer science concept. O.M.E.G.A will retrieve exact excerpts from your imported materials and cite page numbers.
              </p>
              <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={askSubject}
                  onChange={(e) => setAskSubject(e.target.value)}
                  placeholder="Subject filter (optional)"
                  className="mono sm:w-56 rounded border border-panel-border bg-void px-3 py-2 text-[12px] text-text focus:outline-none focus:border-pulse"
                />
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Explain paging vs segmentation using my operating systems notes"
                  className="mono flex-1 rounded border border-panel-border bg-void px-4 py-2.5 text-[13px] text-text focus:outline-none focus:border-pulse"
                  required
                />
                <button
                  type="submit"
                  disabled={asking}
                  className="mono rounded bg-pulse/20 hover:bg-pulse/30 text-pulse border border-pulse/40 px-6 py-2 text-[12px] font-semibold uppercase transition-colors"
                >
                  {asking ? "Searching…" : "Ask Assistant"}
                </button>
              </form>
            </div>

            {askResult && (
              <div className="rounded border border-panel-border bg-panel/90 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-panel-border pb-3">
                  <span className="mono text-[13px] text-text font-semibold">
                    Q: {askResult.question}
                  </span>
                  <span className="mono text-[11px] text-signal">
                    {askResult.citations?.length || 0} Sources Grounded
                  </span>
                </div>

                <div className="prose prose-invert text-[13px] leading-relaxed text-text whitespace-pre-wrap font-sans">
                  {askResult.answer}
                </div>

                {askResult.citations && askResult.citations.length > 0 && (
                  <div className="border-t border-panel-border pt-3">
                    <span className="label block mb-2 text-text-muted">Citations &amp; Provenance:</span>
                    <div className="flex flex-wrap gap-2">
                      {askResult.citations.map((c: any, i: number) => (
                        <span key={i} className="mono text-[11px] px-2.5 py-1 rounded bg-panel-border text-signal">
                          📖 {c.doc_title} — Page {c.page_number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Quizzes */}
        {tab === "quiz" && (
          <div className="space-y-6">
            <div className="rounded border border-panel-border bg-panel/70 p-5 backdrop-blur-sm">
              <span className="label block mb-2 text-research">Computer Science Practice Quiz</span>
              <div className="flex flex-wrap gap-3 mt-3">
                <input
                  type="text"
                  value={quizSubject}
                  onChange={(e) => setQuizSubject(e.target.value)}
                  placeholder="Subject (e.g. Operating Systems)"
                  className="mono rounded border border-panel-border bg-void px-3 py-1.5 text-[12px] text-text"
                />
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="Topic (e.g. Process Scheduling)"
                  className="mono rounded border border-panel-border bg-void px-3 py-1.5 text-[12px] text-text flex-1"
                />
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="mono rounded bg-research/20 hover:bg-research/30 text-research border border-research/40 px-5 py-1.5 text-[12px] font-semibold uppercase transition-colors"
                >
                  {generatingQuiz ? "Synthesizing Quiz…" : "Generate Practice Quiz"}
                </button>
              </div>
            </div>

            {/* Quiz Questions */}
            {quizData && quizData.questions && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="label text-text">
                    Quiz: {quizData.subject} › {quizData.topic}
                  </span>
                  <span className="mono text-[11px] text-text-muted">{quizData.questions.length} Questions</span>
                </div>

                {quizData.questions.map((q: any, idx: number) => {
                  const result = submittedAnswers[idx];
                  return (
                    <div key={idx} className="rounded border border-panel-border bg-panel/80 p-5 space-y-3">
                      <span className="font-semibold text-[13px] text-text block">
                        {idx + 1}. {q.question}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt: string, optIdx: number) => {
                          const optKey = opt.charAt(0);
                          const isSelected = selectedAnswers[idx] === optKey;
                          return (
                            <button
                              key={optIdx}
                              disabled={Boolean(result)}
                              onClick={() => setSelectedAnswers((prev) => ({ ...prev, [idx]: optKey }))}
                              className={`mono text-left text-[12px] px-3 py-2 rounded border transition-colors ${
                                isSelected
                                  ? "border-signal bg-signal/15 text-signal"
                                  : "border-panel-border bg-void/50 text-text hover:bg-panel-border/40"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {!result && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleSubmitQuizAnswer(idx, q)}
                            disabled={!selectedAnswers[idx]}
                            className="mono text-[11px] px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-text font-semibold uppercase disabled:opacity-40"
                          >
                            Submit Answer
                          </button>
                        </div>
                      )}

                      {result && (
                        <div
                          className={`mt-2 p-3 rounded mono text-[12px] border ${
                            result.is_correct
                              ? "border-signal/40 bg-signal/10 text-signal"
                              : "border-alert/40 bg-alert/10 text-alert"
                          }`}
                        >
                          <div className="font-semibold mb-1">
                            {result.is_correct ? "✓ Correct Answer!" : `✗ Incorrect. Correct: Option ${q.correct_answer}`}
                          </div>
                          <div className="text-[11px] text-text/80">{result.explanation}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Analytics */}
            {analytics && analytics.topic_analytics && analytics.topic_analytics.length > 0 && (
              <div className="rounded border border-panel-border bg-panel/40 p-5">
                <span className="label block mb-3 text-text">Recorded Learning Analytics</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {analytics.topic_analytics.map((stat: any, i: number) => (
                    <div key={i} className="rounded border border-panel-border bg-void p-3">
                      <span className="text-[12px] font-semibold text-text block truncate">{stat.topic}</span>
                      <span className="mono text-[10px] text-text-muted">{stat.subject}</span>
                      <div className="mt-2 flex items-baseline justify-between mono text-[12px]">
                        <span>Accuracy:</span>
                        <span style={{ color: stat.accuracy_pct >= 60 ? TOKENS.signal : TOKENS.alert }}>
                          {stat.accuracy_pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
