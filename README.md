<div align="center">

# ⚡ O.M.E.G.A
### **Orchestrated Multi-Expert Graph Architecture**
#### *A Real-Time, Local-First Personal AI Operating Environment*

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Gemini 3.8](https://img.shields.io/badge/Google_Gemini-3.8_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>O.M.E.G.A</b> transforms the traditional operating system interface into a high-performance, real-time AI command center. It bridges natural language intent with verifiable operating system control, persistent personal memory, an academic study &amp; RAG engine, and an interactive 3D neural knowledge graph.
</p>

</div>

---

## 📌 Resume Project Highlights

- **Full-Stack AI Architecture**: Built a production-grade, local-first desktop AI operating environment combining a **React 19 + Three.js** cyberpunk command cockpit with a high-throughput **Python FastAPI** backend communicating over bidirectional **WebSockets**.
- **Autonomous Multi-Agent Orchestration**: Designed a specialized 8-agent swarm (*Orchestrator, Code Engineer, Researcher, Data Analyst, Security Guard, Memory Keeper, UI Agent, Scheduler*) coordinating task decomposition, tool invocation, and streaming reasoning traces.
- **Audited OS & Developer Automation**: Implemented a secure, schema-validated execution engine capable of launching applications, querying file trees, managing user processes, and running developer command workflows (`git`, `npm`, `pytest`, `tsc`) with automatic rollback and zero shell-string interpolation.
- **Enterprise-Grade Security Engine**: Enforced a 5-tier risk taxonomy (`READ_ONLY`, `REVERSIBLE`, `DESTRUCTIVE`, `SENSITIVE`, `PRIVILEGED`) featuring real-time human-in-the-loop confirmation modals, path-traversal sandboxing, secret redaction, and SQLite audit logging.
- **Source-Grounded Study Assistant (RAG)**: Developed an educational knowledge ingestion pipeline for PDF textbooks and markdown notes using chunk-based indexing, cited question answering (title & page provenance), and dynamic multiple-choice quiz synthesis.
- **Persistent 3D Neural Knowledge Graph**: Backed by SQLite and **NetworkX**, rendering interconnected computer science concepts, lecture notes, and memories in a dynamic force-directed 3D space with post-processing bloom and neighborhood search.
- **Resilient AI Provider Rotation**: Engineered a multi-key Gemini provider manager with deterministic round-robin load distribution, rate-limit (429) cooldown tracking, bounded retries, and key health telemetry.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              O.M.E.G.A Cockpit (Frontend)                              │
│                                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐  │
│   │     AI Core 3D      │   │    Command Console       │   │  Status Strip         │  │
│   │ (Deforming R3F Mesh)│   │ (Thought Stream + Voice) │   │ (Hardware Telemetry)  │  │
│   └──────────┬──────────┘   └────────────┬─────────────┘   └───────────┬───────────┘  │
│              │                           │                             │              │
│   ┌──────────┴──────────┐   ┌────────────┴─────────────┐   ┌───────────┴───────────┐  │
│   │   Agent Mesh Rail   │   │  Persistent Memory Rail  │   │ Security Approval UI  │  │
│   └─────────────────────┘   └──────────────────────────┘   └───────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Bidirectional WebSockets + REST APIs
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                              O.M.E.G.A Backend (FastAPI)                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🧠 AI Orchestration: Gemini 3.8 Flash · Multi-Key Provider Manager · Tool Calling     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🛡️ Security Sandbox: 5 Risk Tiers · Path Traversal Guard · Interactive Approvals       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  💻 OS Execution: Process Manager · App Launcher · Workspace Filesystem · Dev CLI     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  📚 Study & RAG Engine: PDF Parser · Chunk Indexing · Cited Q&A · Interactive Quizzes  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🕸️ Neural Knowledge Graph: SQLite Graph Tables · NetworkX Shortest Paths & Neighbors  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  📊 Real Telemetry: Hardware Worker (psutil) · Streaming CPU/RAM/Disk Metrics          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features

### 1. Natural Language OS Control
- **Application Orchestration**: Discover, launch, and verify desktop applications (`VS Code`, default browser, file explorer, terminal, notepad) with execution verification.
- **Protected Filesystem Engine**: List directories, inspect file metadata, perform pattern searches, read text files, and edit workspace source files with automatic `.bak` backups.
- **Process Inspection & Safeguards**: Real-time process monitoring sorted by CPU/memory usage with safeguards preventing accidental termination of critical OS binaries (`explorer.exe`, `system`, `csrss.exe`).
- **Developer Workflow Tooling**: Execute approved developer commands (`git status`, `git diff`, `npm test`, `pytest`, `python`) directly through structured argument arrays.

### 2. Multi-Key Resilient Gemini Provider Manager
- Deterministic round-robin key rotation across configured Gemini credentials.
- Automatic rate-limit handling: Keys hitting HTTP 429 / `RESOURCE_EXHAUSTED` enter a timed cooldown, automatically falling back to healthy standby keys.
- Automatic secret redactor ensuring API keys never leak into console logs, audit files, or UI payloads.

### 3. Personal Study Assistant (Academic RAG)
- **Document Ingestion**: Upload and index PDF textbooks, course slides, and Markdown lecture notes.
- **Page-Level Grounded Citations**: Answers complex technical questions strictly using imported course materials, citing document titles and page numbers.
- **Interactive Quizzes & Analytics**: Generates targeted multiple-choice practice quizzes with automated grading, explanations, and weak-topic tracking.

### 4. Interactive 3D Neural Knowledge Graph
- Persistent graph database storing nodes (*Subjects, Concepts, Definitions, Documents, Memories*) and directed relations (*contains, requires, related_to, touches*).
- Dynamic force layout rendered with React Three Fiber, OrbitControls, bloom luminance, and depth-of-field post-processing.
- Real-time concept search and neighborhood subgraph filtering.

### 5. Multi-Tier Security & Human-In-The-Loop Authorizations
- Categorizes all actions into 5 risk levels:
  - `READ_ONLY`: Automated safe execution.
  - `REVERSIBLE`: File writes with automatic backup snapshots.
  - `DESTRUCTIVE`: Permanent deletions and process kills requiring explicit user approval.
  - `SENSITIVE`: Terminal command execution, clipboard access, screenshot capture.
  - `PRIVILEGED`: High-impact system configurations.
- Modal approval prompts allow users to inspect proposed command arguments before authorizing execution.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Space Grotesk, JetBrains Mono |
| **3D Visualization** | Three.js, React Three Fiber (R3F), @react-three/drei, postprocessing, d3-force-3d |
| **Audio & Speech** | Web Speech API (Synthesis & Recognition), Web Audio API, procedural Sonar synthesizers |
| **Backend API** | Python 3.14, FastAPI, Uvicorn, WebSockets, Pydantic Settings |
| **AI & LLM** | Google Gemini 3.8 Flash, Google GenAI SDK (`google-genai` v2.31.0) |
| **Graph & Storage** | SQLite3 (Persistent Store, Audit Logs, Memories), NetworkX (Graph Algorithms) |
| **System & RAG** | psutil (Hardware Telemetry), pypdf (Document Ingestion), custom chunking & indexing |
| **Testing & Quality**| pytest, pytest-asyncio, oxlint, TypeScript compiler (`tsc -b`) |

---

## 📦 Project Structure

```
O.M.E.G.A/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI server & WebSocket router
│   │   ├── config.py                   # Pydantic environment settings & secret redactor
│   │   ├── ai/
│   │   │   ├── provider_manager.py     # Multi-key rotation & cooldown tracker
│   │   │   ├── gemini_client.py        # Google GenAI SDK interface
│   │   │   └── orchestrator.py         # Multi-agent intent routing & tool execution loop
│   │   ├── os_control/
│   │   │   ├── registry.py             # Central tool registry & Gemini function schemas
│   │   │   ├── applications.py         # App discovery & launch verification
│   │   │   ├── filesystem.py           # Sandboxed file operations & backups
│   │   │   ├── processes.py            # Process inspection & critical safeguards
│   │   │   ├── terminal.py             # Developer command runner (git, npm, pytest)
│   │   │   ├── system_info.py          # Real hardware telemetry (psutil)
│   │   │   └── media.py                # Volume, clipboard, and screenshots
│   │   ├── security/
│   │   │   ├── permissions.py          # 5-tier risk policies & approval queue
│   │   │   ├── validation.py           # Path containment & command whitelist
│   │   │   └── audit.py                # Immutable SQLite audit trail
│   │   ├── memory/
│   │   │   └── store.py                # Persistent personal facts, decisions & notes
│   │   ├── study/
│   │   │   ├── ingestion.py            # PDF & text chunking pipeline
│   │   │   ├── retrieval.py            # Source-grounded cited Q&A engine
│   │   │   ├── quiz.py                 # Interactive quiz generator & analytics
│   │   │   └── graph_builder.py        # SQLite + NetworkX knowledge graph engine
│   │   ├── events/
│   │   │   └── websocket_manager.py    # Real-time WebSocket connection manager
│   │   └── api/                        # REST endpoints (chat, system, memory, study, graph)
│   ├── tests/                          # 18 automated backend pytest suites
│   ├── requirements.txt                # Python backend dependencies
│   └── pytest.ini                      # Backend test configuration
├── src/
│   ├── App.tsx                         # Main cockpit component & view router
│   ├── components/
│   │   ├── AICore.tsx                  # 3D interactive neural core
│   │   ├── CommandConsole.tsx          # Thought trace ticker & voice/chat terminal
│   │   ├── AgentRail.tsx               # Active agent roster & waveform visualizer
│   │   ├── MemoryRail.tsx              # Live memory touches & provenance feed
│   │   ├── StatusStrip.tsx             # Real-time telemetry sparkline & navigation
│   │   ├── NeuralGraphPage.tsx         # 3D force-directed knowledge graph explorer
│   │   ├── StudyPanel.tsx              # Study library, cited chat & quiz workspace
│   │   ├── ApprovalModal.tsx           # Security authorization modal
│   │   └── SettingsModal.tsx           # Key health, hardware diagnostics & audit viewer
│   ├── lib/
│   │   ├── api.ts                      # Frontend REST & WebSocket client
│   │   ├── systemState.ts              # Live system state hook & data contracts
│   │   └── moodTheme.ts                # Futuristic color tokens & mood styling
├── start_omega.bat                     # Windows one-click launcher (Backend + Frontend)
├── run_backend.bat                     # Windows backend service launcher
├── .env.example                        # Template environment configuration
└── package.json                        # Node dependencies and scripts
```

---

## ⚡ Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.0 or higher
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/MudharsonPrabhu/O.M.E.G.A.git
cd O.M.E.G.A
```

### 2. Configure Environment Variables
Copy `.env.example` to `backend/.env` and insert your Gemini API key:
```bash
cp .env.example backend/.env
```
Edit `backend/.env`:
```env
GEMINI_API_KEYS=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

### 3. Install Backend Dependencies
```bash
python -m venv backend/.venv

# Windows
.\backend\.venv\Scripts\pip install -r backend\requirements.txt

# Linux / macOS
./backend/.venv/bin/pip install -r backend/requirements.txt
```

### 4. Install Frontend Dependencies
```bash
npm install
```

---

## 💻 Running O.M.E.G.A

### One-Click Launch (Windows)
Double-click `start_omega.bat` in the project root to start both backend and frontend services simultaneously.

### Manual Launch

**Terminal 1 — Backend:**
```bash
# Windows
.\backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Linux / macOS
./backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Open your browser to **`http://localhost:5173`**.

---

## 🧪 Testing

### Automated Backend Tests
```bash
# Run 18 comprehensive unit and integration tests
.\backend\.venv\Scripts\python -m pytest -v
```

### Frontend Typechecking & Linting
```bash
npm run build
npm run lint
```

---

## 🛡️ Security & Privacy Guarantees

- **Local-First Processing**: Study notes, memory entries, audit logs, and graph topologies remain entirely on the local computer in SQLite (`backend/data/omega.db`).
- **Strict Data Minimization**: Only the text explicitly required for an AI query is transmitted to the configured Gemini model.
- **Default-Deny Tooling**: Tools outside the pre-registered schema cannot be called. Destructive operations require interactive user consent.
- **Zero Raw Shells**: All system commands use discrete argument lists through `asyncio.create_subprocess_exec`, avoiding shell injection vulnerabilities.

---

## 👤 Author

**Mudharson Prabhu S**
- GitHub: [@MudharsonPrabhu](https://github.com/MudharsonPrabhu)
- Project Repository: [https://github.com/MudharsonPrabhu/O.M.E.G.A.git](https://github.com/MudharsonPrabhu/O.M.E.G.A.git)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
