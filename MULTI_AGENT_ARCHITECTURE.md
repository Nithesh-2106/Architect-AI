# ArchitectAI: Multi-Agent Architecture & Flow

ArchitectAI uses a massive, orchestrated swarm of **19 specialized AI agents** to debate, critique, and synthesize software architectures. Each agent has a distinct personality, technical bias, and domain of expertise.

---

## 🎭 The 19 Agents

### Phase 1: The Visionaries (Architecture Proposers)
These 7 agents are responsible for generating the initial architectural proposals. They work concurrently to design the system based solely on the initial user brief, viewing the problem through their specific lens.

1. **AGENT-01: Microservices Advocate** (🏗️) 
   * **Bias:** Independent deployment, domain-driven design, scalability.
   * **Role:** Proposes highly decoupled, resilient microservice topologies.
2. **AGENT-02: Monolith Defender** (🧱) 
   * **Bias:** Simplicity, low operational overhead, YAGNI.
   * **Role:** Proposes clean modular monoliths, optimizing for speed and small teams.
3. **AGENT-03: Serverless Evangelist** (☁️) 
   * **Bias:** Zero ops, infinite scale, pay-per-execution.
   * **Role:** Proposes event-driven FaaS architectures using Lambda/Cloudflare.
4. **AGENT-14: Event-Driven Prophet** (🔄)
   * **Bias:** Asynchronous decoupling, message brokers, eventual consistency.
   * **Role:** Designs systems around Kafka, EventBridge, and Pub/Sub mechanics.
5. **AGENT-15: AI-Native Architect** (🧠)
   * **Bias:** LLM routing, RAG architectures, agentic flows.
   * **Role:** Reimagines standard apps as intelligent, probabilistic systems.
6. **AGENT-16: Edge-First Specialist** (⚡)
   * **Bias:** Zero latency, local-first data, global distribution.
   * **Role:** Pushes compute to the CDN edge via Turso, Cloudflare Workers, and edge caching.
7. **AGENT-17: Boring Tech Pragmatist** (📦)
   * **Bias:** Proven stability, PostgreSQL, Django/Rails, avoiding hype.
   * **Role:** Argues for 10-year-old proven technologies over shiny new frameworks.

### Phase 2: The Attack
8. **AGENT-08: Devil's Advocate** (👿)
   * **Role:** The antagonist. Reads all 7 visionary proposals and ruthlessly attacks them to find single points of failure, scaling limits, and budget overruns. Generates critical severity ratings for every flaw.

### Phase 3: The Analysts & Specialists (Validation)
These 6 agents act as objective third-party validators. They do not propose whole architectures; they score and critique the proposals based on strict metrics.

9. **AGENT-04: Security Auditor** (🔒) - Evaluates IAM, encryption, zero-trust, and compliance risks.
10. **AGENT-05: Performance Engineer** (🚀) - Evaluates latency bottlenecks, database indexing, and caching layers.
11. **AGENT-06: Data Architecture Specialist** (🗄️) - Evaluates schema design, ACID vs BASE, and data migration paths.
12. **AGENT-07: DevOps & Platform Engineer** (🛠️) - Evaluates CI/CD complexity, infrastructure as code, and observability.
13. **AGENT-11: Migration Strategist** (🛡️) - Evaluates how difficult it will be to build or migrate to the proposed state.
14. **AGENT-12: Observability Architect** (📊) - Evaluates logging, distributed tracing, and metrics collection.

*(Specialist Validators)*
15. **AGENT-09: Tech Feasibility Validator** (🔍) - Cross-references the proposed tech stacks against the user's team size and skill gaps.
16. **AGENT-10: Cost & ROI Analyst** (💰) - Calculates realistic 12-month USD cloud infrastructure costs.
17. **AGENT-18: AI/ML Infrastructure Engineer** (🤖) - Calculates GPU serving costs, latency, and deployment strategies for AI features.
18. **AGENT-19: Sustainability Architect** (🌱) - Estimates the carbon footprint and Green Software Foundation (SCI) impact of the architecture.

### Phase 4 & 5: Strategy and Consensus
19. **AGENT-13: Architect Finaliser** (⚖️)
    * **Role:** The ultimate decision-maker. After the Visionaries revise their architectures and all agents vote, AGENT-13 reads the entire debate transcript, synthesizes the best components into a final, definitive architecture, and generates the final Architecture Decision Record (ADR) and Mermaid Diagram.

---

## 🌊 The Debate Engine Flow

The simulation runs through a highly structured asynchronous pipeline powered by `asyncio` in Python. 

### Step 1: Initial Vision (Concurrent)
The user brief is broadcast to **Agents 01, 02, 03, 14, 15, 16, and 17**. All 7 LLMs run in parallel, streaming their token-by-token generation to the frontend. They each output a JSON schema detailing their proposed architecture.

### Step 2: The Brutal Critique
**AGENT-08** (Devil's Advocate) ingests all 7 proposals. It generates a multi-pronged attack, pointing out exact technical flaws in each proposal, categorized by severity (Critical, Major, Minor).

### Step 3: Deep Analysis (Concurrent)
While the visionaries reel from the critique, the specialist agents kick in. 
* **AGENT-09** validates team skills.
* **AGENT-10** calculates dollar costs.
* **AGENT-18** plans GPU servers.
* **AGENT-19** measures carbon footprint.
These run concurrently via `asyncio.gather` and stream their findings to the live log.

### Step 4: The Revision
The 7 Visionaries are woken back up. They are fed their original proposal + the Devil's Advocate's attack + the Validation results. They are prompted to "concede where valid, but defend your core." They generate a revised JSON architecture.

### Step 5: Cross-Agent Voting
Every single agent (Visionaries + Specialists) looks at all 7 *revised* proposals. They cast cross-votes, pulling the best database strategy from the Monolith, the best API layer from the Microservices, etc.

### Step 6: Final Synthesis
**AGENT-13** (Architect Finaliser) receives the massive transcript of all proposals, critiques, costs, validations, and votes. It produces the single, hybrid, optimal "gold standard" architecture, which is rendered on the frontend as the final result.

### Step 7: Document Generation
The backend utilizes `ReportLab` and `python-docx` to convert AGENT-13's final output into beautifully formatted downloadable reports.
