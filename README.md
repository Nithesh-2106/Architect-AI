# ArchitectAI — Multi-Agent Architecture Design System

A real-time multi-agent debate system where 19 specialised AI agents argue, critique, validate and synthesise optimal software architectures with full streaming transparency.

## What You Get

- **Real-time thinking streams** — watch every agent reason token-by-token
- **Agent battles** — Devil's Advocate tears apart every proposal with surgical critique
- **Tech validation** — AGENT-09 verifies all technology claims and skill-fit
- **Cost modelling** — 12-month TCO estimated for every proposal
- **Cross-agent voting** — agents vote on the best components from rivals
- **Final synthesis** — Architect Finaliser merges the best elements
- **Downloadable reports** — full PDF + DOCX with ADR, risk register, cost projection, scorecard, Mermaid diagram
- **Session history** — all sessions stored in SQLite (or PostgreSQL)

## Project Structure

```
architect-ai/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # FastAPI endpoints + SSE stream
│   │   ├── db/
│   │   │   ├── database.py        # Async SQLAlchemy engine
│   │   │   └── models.py          # DB models (sessions, proposals, messages, architectures)
│   │   ├── debate/
│   │   │   ├── agents.py          # All 19 agent implementations (streaming LLM calls)
│   │   │   ├── engine.py          # Full debate orchestration engine
│   │   │   └── prompts.py         # All agent system prompts
│   │   ├── services/
│   │   │   ├── document_generator.py  # PDF + DOCX generation
│   │   │   └── sse_publisher.py       # SSE event pub/sub via asyncio.Queue
│   │   ├── config.py              # Settings (API keys, DB URL)
│   │   └── main.py                # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── start.sh
├── frontend/
│   ├── src/
│   │   ├── api/client.ts          # Axios API client
│   │   ├── components/
│   │   │   ├── AgentCard.tsx      # Agent status card with confidence + thinking preview
│   │   │   ├── BattlePanel.tsx    # Devil's Advocate critiques display
│   │   │   ├── DebateLog.tsx      # Live event log
│   │   │   ├── MermaidDiagram.tsx # Architecture diagram renderer
│   │   │   ├── PhaseTimeline.tsx  # 7-phase progress bar
│   │   │   ├── ResultPanel.tsx    # Final architecture tabs (diagram, ADR, risks, costs)
│   │   │   ├── ScorecardChart.tsx # Radar chart scorecard
│   │   │   └── ThinkingPanel.tsx  # Full streaming thinking trace
│   │   ├── hooks/
│   │   │   └── useSessionStream.ts # SSE EventSource hook with reconnect
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── SetupPage.tsx      # Project brief form
│   │   │   ├── DebatePage.tsx     # Main debate arena (3-panel layout)
│   │   │   └── HistoryPage.tsx    # Session history
│   │   ├── store/debateStore.ts   # Zustand store — processes all SSE events
│   │   ├── types.ts               # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
└── docker-compose.yml             # PostgreSQL + Redis (optional)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- An Anthropic API key

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DATABASE_URL=sqlite+aiosqlite:///./architect_ai.db   ← default, no setup needed

# Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend starts at **http://localhost:8000**
Database is created automatically as `architect_ai.db` on first run.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:5173**

### 3. Open in Browser

Go to **http://localhost:5173** and click **"Launch Debate"**

---

## Using PostgreSQL Instead of SQLite (Optional)

```bash
# Start PostgreSQL + Redis via Docker
docker-compose up -d

# Update .env
DATABASE_URL=postgresql+asyncpg://architectai:architectai@localhost:5432/architectai
```

---

## How the Debate Works

```
Phase P1: Parallel Proposals
  → 13 architect agents (Visionaries & Specialists) simultaneously generate proposals
  → Each streams tokens in real-time via SSE

Phase P2: Devil's Advocate
  → AGENT-08 reads all proposals and generates brutal critiques
  → Severity: Critical / Major / Minor per proposal

Phase P3: Validation, Cost & Specialist Analysis (parallel)
  → AGENT-09 validates tech claims and skill-fit
  → AGENT-10 estimates 12-month TCO for each proposal
  → AGENT-18 evaluates AI/ML infrastructure readiness
  → AGENT-19 scores proposals on Sustainability and Carbon Efficiency

Phase P4: Revisions (parallel)
  → Each architect agent revises under critique pressure
  → Agents concede where valid, defend their core approach

Phase P5: Cross-Agent Voting
  → All agents vote on best components from rivals
  → Convergence score computed

Phase P6: Finalization
  → AGENT-13 reads full debate transcript + votes
  → Synthesises definitive architecture with ADR + Mermaid diagram

Phase P7: Document Generation
  → PDF report generated with ReportLab
  → DOCX report generated with python-docx
  → Files saved to ./output/ and served via /files/ endpoint
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create session + start debate |
| GET | `/api/sessions` | List all sessions (history) |
| GET | `/api/sessions/{id}` | Full session data + architecture |
| GET | `/api/sessions/{id}/stream` | SSE stream of live events |
| GET | `/api/files/{filename}` | Download PDF or DOCX |
| GET | `/health` | Health check |

---

## SSE Events Reference

| Event | Description |
|-------|-------------|
| `phase.started` | A new debate phase begins |
| `agent.started` | An agent activates |
| `agent.thinking` | Streaming token from agent's LLM call |
| `agent.proposal.draft` | Agent's complete initial proposal |
| `agent.critique.issued` | Devil's Advocate critique (severity + details) |
| `validation.result` | Tech validation verdict per proposal |
| `cost.projection` | Cost estimate per proposal |
| `ml.infrastructure.ready` | AI/ML serving strategy and GPU cost estimate |
| `sustainability.scored` | Green Software Carbon Intensity score |
| `agent.revising` | Agent begins revision |
| `agent.proposal.revised` | Revised proposal with concessions/defenses |
| `agent.vote.cast` | Cross-agent vote |
| `convergence.score` | Current convergence metric |
| `finaliser.complete` | Synthesis done |
| `document.ready` | PDF/DOCX download URLs |
| `session.completed` | Full session done |
| `session.failed` | Error (with message) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | required | Your Anthropic API key |
| `DATABASE_URL` | `sqlite+aiosqlite:///./architect_ai.db` | SQLite or PostgreSQL |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `model_primary` | `claude-sonnet-4-20250514` | Primary model for architect agents |
| `model_fast` | `claude-haiku-4-5-20251001` | Fast model for validator + cost analyst |

---

## Cost Estimate

Each full debate session uses approximately:
- ~13 primary model calls (architect agents, ~4k tokens each output)
- ~4 fast model calls (validator, cost analyst, ML, sustainability)
- ~13 revision calls (primary model)
- ~13 voting calls (primary model)
- ~1 finaliser call (~6k tokens output)

**Estimated per session: $0.30–$0.80** depending on project complexity.

---

## Troubleshooting

**"Session failed" immediately:**
- Check your `ANTHROPIC_API_KEY` in `.env`
- Ensure the backend is running on port 8000
- Check backend terminal for Python errors

**SSE stream not connecting:**
- Ensure backend is running (`http://localhost:8000/health` returns `{"status":"ok"}`)
- Check browser console for CORS errors
- Vite proxy in `vite.config.ts` should handle `/api` → `localhost:8000`

**PDF/DOCX not generating:**
- `output/` directory must be writable (created automatically)
- Check backend logs for ReportLab / python-docx errors

**Mermaid diagram not rendering:**
- The diagram comes from the LLM — it may sometimes produce invalid Mermaid syntax
- The raw diagram source is always shown below the diagram for manual editing
