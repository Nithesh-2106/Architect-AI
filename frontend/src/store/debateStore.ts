import { create } from 'zustand'
import { AgentState, DebateEvent, FinalArchitecture, AGENT_META } from '../types'

const AGENT_NAMES: Record<string, string> = {
  'AGENT-01': 'Microservices Advocate',
  'AGENT-02': 'Monolith Defender',
  'AGENT-03': 'Serverless Evangelist',
  'AGENT-04': 'Security Auditor',
  'AGENT-05': 'Performance Engineer',
  'AGENT-06': 'Data Architecture Specialist',
  'AGENT-07': 'DevOps & Platform Engineer',
  'AGENT-08': "Devil's Advocate",
  'AGENT-09': 'Tech Feasibility Validator',
  'AGENT-10': 'Cost & ROI Analyst',
  'AGENT-11': 'Migration Strategist',
  'AGENT-12': 'Observability Architect',
  'AGENT-13': 'Architect Finaliser',
  // New Visionaries
  'AGENT-14': 'Event-Driven Prophet',
  'AGENT-15': 'AI-Native Architect',
  'AGENT-16': 'Edge-First Specialist',
  'AGENT-17': 'Boring Tech Pragmatist',
  // New Specialists
  'AGENT-18': 'AI/ML Infrastructure Engineer',
  'AGENT-19': 'Sustainability Architect',
}

function makeAgent(id: string): AgentState {
  const meta = AGENT_META[id] || { emoji: '🤖', color: '#94a3b8' }
  return {
    agent_id: id,
    agent_name: AGENT_NAMES[id] || id,
    emoji: meta.emoji,
    color: meta.color,
    status: 'idle',
    thinking_text: '',
    proposal: null,
    confidence: 0,
    critique_received: null,
    revision: null,
    votes_cast: 0,
  }
}

const ARCHITECT_IDS = [
  'AGENT-01', 'AGENT-02', 'AGENT-03',
  'AGENT-14', 'AGENT-15', 'AGENT-16', 'AGENT-17',
  'AGENT-04', 'AGENT-05', 'AGENT-06', 'AGENT-07', 'AGENT-11', 'AGENT-12',
]
const ALL_IDS = [...ARCHITECT_IDS, 'AGENT-08', 'AGENT-09', 'AGENT-10', 'AGENT-18', 'AGENT-19', 'AGENT-13']

interface DebateLog {
  id: string
  timestamp: number
  event_type: string
  from_agent: string
  to_agent?: string
  content: string
  severity?: string
  color: string
  emoji: string
}

interface CostDataPoint {
  agent_id: string
  agent_name: string
  monthly_usd: number
  yearly_usd: number
  cost_vs_budget: string
  color: string
}

interface DebateStore {
  // Status
  sessionId: string | null
  phase: string
  convergenceScore: number
  status: 'idle' | 'running' | 'completed' | 'failed'

  // Agents
  agents: Record<string, AgentState>

  // Debate log (all messages for the log panel)
  debateLog: DebateLog[]

  // Phase events
  phaseHistory: Array<{ phase: string; name: string; description: string; ts: number }>

  // Critiques for the "Battle" panel
  critiques: Array<{ from: string; target: string; severity: string; title: string; critique: string; issues: string[] }>

  // Votes
  votes: Array<{ from_agent: string; recommendation: string }>

  // Cost chart data
  costChartData: CostDataPoint[]

  // Final architecture
  finalArchitecture: FinalArchitecture | null
  documentUrls: { pdf_url: string | null; docx_url: string | null }

  // Actions
  setSessionId: (id: string) => void
  resetDebate: () => void
  dispatch: (event: DebateEvent) => void
  addLog: (log: DebateLog) => void
  setFinalArchFromAPI: (arch: any, pdfUrl: string | null, docxUrl: string | null) => void
}

export const useDebateStore = create<DebateStore>((set, get) => ({
  sessionId: null,
  phase: 'Waiting to start',
  convergenceScore: 0,
  status: 'idle',
  agents: Object.fromEntries(ALL_IDS.map(id => [id, makeAgent(id)])),
  debateLog: [],
  phaseHistory: [],
  critiques: [],
  votes: [],
  costChartData: [],
  finalArchitecture: null,
  documentUrls: { pdf_url: null, docx_url: null },

  setSessionId: (id) => set({ sessionId: id }),

  setFinalArchFromAPI: (arch, pdfUrl, docxUrl) => set({
    finalArchitecture: {
      id: arch.id || 'final',
      pattern: arch.pattern || 'hybrid',
      summary: arch.summary || '',
      tech_stack: arch.tech_stack || {},
      components: arch.components || [],
      adr: arch.adr || '',
      risk_register: arch.risk_register || [],
      cost_projection: arch.cost_projection || { monthly_usd: 0, yearly_usd: 0 },
      timeline: arch.timeline || { mvp_weeks: 8, production_weeks: 16, phases: [] },
      mermaid_diagram: arch.mermaid_diagram || '',
      scorecard: arch.scorecard || {},
      overall_confidence: typeof arch.overall_confidence === 'number' ? arch.overall_confidence : 0.75,
      why_this_wins: arch.why_this_wins || '',
    },
    status: 'completed',
    phase: 'Completed',
    documentUrls: { pdf_url: pdfUrl || null, docx_url: docxUrl || null },
  }),

  resetDebate: () => set({
    phase: 'Waiting to start',
    convergenceScore: 0,
    status: 'idle',
    agents: Object.fromEntries(ALL_IDS.map(id => [id, makeAgent(id)])),
    debateLog: [],
    phaseHistory: [],
    critiques: [],
    votes: [],
    costChartData: [],
    finalArchitecture: null,
    documentUrls: { pdf_url: null, docx_url: null },
  }),

  addLog: (log) => set(state => ({
    debateLog: [...state.debateLog, log].slice(-800)
  })),

  dispatch: (event: DebateEvent) => {
    const { type, payload } = event
    const meta = AGENT_META[payload?.agent_id] || AGENT_META['SYSTEM'] || { emoji: '⚙️', color: '#64748b' }

    const addLog = (content: string, agentId?: string, severity?: string) => {
      const m = agentId ? (AGENT_META[agentId] || meta) : meta
      get().addLog({
        id: (event.id || String(Date.now())) + Math.random(),
        timestamp: event.ts || Date.now() / 1000,
        event_type: type,
        from_agent: agentId || 'SYSTEM',
        content,
        severity,
        color: m.color,
        emoji: m.emoji,
      })
    }

    set(state => {
      const agents = { ...state.agents }
      const updateAgent = (id: string, updates: Partial<AgentState>) => {
        if (agents[id]) agents[id] = { ...agents[id], ...updates }
      }

      switch (type) {
        case 'phase.started':
          addLog(`Phase ${payload.phase}: ${payload.name} — ${payload.description}`, undefined)
          return {
            agents,
            phase: payload.name,
            phaseHistory: [...state.phaseHistory, {
              phase: payload.phase, name: payload.name,
              description: payload.description, ts: Date.now(),
            }],
          }

        case 'agent.started':
          updateAgent(payload.agent_id, { status: 'thinking', thinking_text: '' })
          {
            const specialistIntros: Record<string, string> = {
              'AGENT-09': '🔍 Starting **Tech Feasibility Analysis** — scanning all proposals for skill gaps and technology validity...',
              'AGENT-10': '💰 Starting **Cost & ROI Analysis** — modeling 12-month TCO for every architecture proposal...',
              'AGENT-18': '🧠 Starting **AI/ML Infrastructure Analysis** — evaluating GPU requirements, serving strategies, and ML platform costs...',
              'AGENT-19': '🌱 Starting **Sustainability Analysis** — calculating carbon footprint and SCI scores for all proposed architectures...',
            }
            const intro = specialistIntros[payload.agent_id]
            if (intro) {
              addLog(intro, payload.agent_id)
            } else if (['AGENT-01','AGENT-02','AGENT-03','AGENT-14','AGENT-15','AGENT-16','AGENT-17','AGENT-08','AGENT-13'].includes(payload.agent_id)) {
              addLog(`I'm starting my analysis. Let me think through the architecture...`, payload.agent_id)
            }
          }
          return { agents }

        case 'agent.thinking':
          updateAgent(payload.agent_id, {
            status: 'thinking',
            thinking_text: payload.cumulative_text || '',
          })
          return { agents }

        case 'agent.proposal.draft': {
          const proposal = payload.proposal || {}
          const patternName = proposal.pattern || 'hybrid'
          const summary = proposal.summary || ''
          const confidence = Math.round((payload.confidence || proposal.confidence || 0) * 100)
          updateAgent(payload.agent_id, {
            status: 'proposed',
            proposal,
            confidence: payload.confidence || proposal.confidence || 0,
            thinking_text: '',
          })
          // AGENT-08 is a critic, not a proposer — show a different message
          if (payload.agent_id === 'AGENT-08') {
            addLog(
              `Critique phase complete. ${summary}`,
              payload.agent_id
            )
          } else {
            addLog(
              `I'm proposing a **${patternName.toUpperCase()}** architecture. ${summary} Confidence: ${confidence}%.`,
              payload.agent_id
            )
          }
          return { agents }
        }

        case 'agent.critique.issued': {
          updateAgent(payload.from_agent || 'AGENT-08', { status: 'done' })
          updateAgent(payload.target_agent, { critique_received: payload })
          const targetName = AGENT_NAMES[payload.target_agent] || payload.target_agent
          addLog(
            `[${payload.severity}] to ${targetName}: "${payload.title}" — ${payload.critique}`,
            'AGENT-08',
            payload.severity
          )
          return {
            agents,
            critiques: [...state.critiques, {
              from: 'AGENT-08',
              target: payload.target_agent,
              severity: payload.severity,
              title: payload.title,
              critique: payload.critique,
              issues: payload.specific_issues || [],
            }],
          }
        }

        case 'validation.result': {
          // Strip raw JSON from verdict — it shows up when the fallback fires raw[:400]
          const rawVerdict: string = payload.verdict || ''
          const cleanVerdict = rawVerdict.trim().startsWith('{') || rawVerdict.trim().startsWith('[')
            ? `${payload.status || 'REVIEWED'} — tech claims analyzed for ${payload.target_agent || 'all proposals'}`
            : rawVerdict.slice(0, 200) || `${payload.status || 'REVIEWED'}`

          const verifiedClaims = Array.isArray(payload.verified_claims) ? payload.verified_claims : []
          const questionableClaims = Array.isArray(payload.questionable_claims) ? payload.questionable_claims : []

          updateAgent('AGENT-09', {
            status: 'done',
            proposal: {
              summary: cleanVerdict,
              status: payload.status,
              skill_gap_risk: payload.skill_gap_risk,
              verified_claims: verifiedClaims,
              questionable_claims: questionableClaims,
              ...payload,
            }
          })
          const targetName09 = AGENT_NAMES[payload.target_agent] || payload.target_agent || 'ALL'
          const verified = verifiedClaims.slice(0, 2).join('; ')
          const questionable = questionableClaims.slice(0, 2)
            .map((q: any) => typeof q === 'string' ? q : q.claim).join('; ')
          const feasibility = payload.overall_feasibility || payload.status || 'REVIEWED'
          addLog(
            `🔍 **Tech Feasibility → ${targetName09}:** ${feasibility} | Skill-gap risk: **${payload.skill_gap_risk || 'N/A'}**` +
            (verified ? ` | ✅ Verified: ${verified}` : '') +
            (questionable ? ` | ⚠️ Concerns: ${questionable}` : ''),
            'AGENT-09',
            feasibility === 'Infeasible' ? 'Critical' : payload.skill_gap_risk === 'High' ? 'warning' : undefined
          )
          return { agents }
        }


        case 'ml.infrastructure.ready': {
          updateAgent('AGENT-18', {
            status: 'done',
            proposal: { summary: payload.recommendation, ...payload }
          })
          const frameworks = (payload.recommended_frameworks || []).slice(0, 3).join(', ')
          const gpuCost = payload.estimated_gpu_cost_monthly
          addLog(
            `🧠 **AI/ML Infrastructure Proposal:** Serving via **${payload.serving_strategy || 'Managed API'}**` +
            (frameworks ? ` | Frameworks: **${frameworks}**` : '') +
            (gpuCost !== undefined ? ` | GPU Cost: **$${gpuCost}/mo**` : '') +
            (payload.mlops_platform ? ` | MLOps: **${payload.mlops_platform}**` : '') +
            (payload.recommendation ? `\n${payload.recommendation}` : ''),
            'AGENT-18'
          )
          return { agents }
        }

        case 'sustainability.scored': {
          updateAgent('AGENT-19', {
            status: 'done',
            proposal: { summary: payload.recommendation, ...payload }
          })
          const regions = (payload.recommended_regions || []).slice(0, 3).join(', ')
          addLog(
            `🌱 **Sustainability Architecture Proposal:** Energy rating **${payload.energy_efficiency_rating || 'N/A'}** | SCI Score: **${payload.sci_score_estimate || 'N/A'}**` +
            (regions ? ` | Low-carbon regions: **${regions}**` : '') +
            (payload.renewable_energy_percentage ? ` | Renewable: **${payload.renewable_energy_percentage}%**` : '') +
            (payload.recommendation ? `\n${payload.recommendation}` : ''),
            'AGENT-19'
          )
          return { agents }
        }

        case 'cost.projection': {
          // Skip the $0 fallback sentinel — only add real per-agent costs to the chart
          if (payload.target_agent === 'ALL' && payload.monthly_usd === 0) {
            addLog(`💰 **Cost Analysis:** Fallback triggered — AGENT-10 did not return per-proposal costs`, 'AGENT-10', 'warning')
            return { agents }
          }
          const agentName = AGENT_NAMES[payload.target_agent] || payload.target_agent || 'ALL proposals'
          updateAgent('AGENT-10', {
            status: 'done',
            proposal: {
              summary: `Monthly infra cost for ${agentName}: $${(payload.monthly_usd || 0).toLocaleString()} — ${payload.cost_vs_budget}`,
              ...payload
            }
          })
          const roi = payload.roi_assessment
          const devHours = payload.dev_hours_to_build
          addLog(
            `💰 **Cost → ${agentName}:** **$${(payload.monthly_usd || 0).toLocaleString()}/mo** ($${(payload.yearly_usd || 0).toLocaleString()}/yr) — **${payload.cost_vs_budget || 'UNKNOWN'}**` +
            (devHours ? ` | Build: **${devHours}h**` : '') +
            (roi ? ` | ROI: ${roi}` : ''),
            'AGENT-10'
          )
          const existing = state.costChartData.filter(d => d.agent_id !== payload.target_agent)
          const targetColor = (AGENT_META[payload.target_agent] || { color: '#ffd166' }).color
          return {
            agents,
            costChartData: [...existing, {
              agent_id: payload.target_agent,
              agent_name: agentName,
              monthly_usd: payload.monthly_usd || 0,
              yearly_usd: payload.yearly_usd || 0,
              cost_vs_budget: payload.cost_vs_budget || 'UNKNOWN',
              color: targetColor,
            }],
          }
        }

        case 'agent.revising':
          updateAgent(payload.agent_id, { status: 'revising', thinking_text: '' })
          addLog(`I've heard the critique. Let me reconsider my position and revise...`, payload.agent_id)
          return { agents }

        case 'agent.proposal.revised':
          updateAgent(payload.agent_id, {
            status: 'proposed',
            revision: payload,
            confidence: payload.confidence,
            thinking_text: '',
          })
          addLog(
            `I have revised my proposal. My updated **${payload.pattern?.toUpperCase()}** architecture incorporates the feedback. ${payload.summary || ''} My revised confidence: ${Math.round((payload.confidence || 0) * 100)}%.`,
            payload.agent_id
          )
          return { agents }

        case 'convergence.score':
          addLog(
            `Overall convergence is now at **${Math.round(payload.score * 100)}%**${payload.converged ? ' — the debate has converged! ✓' : '.'}`,
            undefined
          )
          return { agents, convergenceScore: payload.score }

        case 'agent.vote.cast': {
          updateAgent(payload.from_agent, { status: 'voted', votes_cast: (agents[payload.from_agent]?.votes_cast || 0) + 1 })
          const rec = payload.recommendation
          const recText = rec && rec.trim().length > 5
            ? `My recommendation: ${rec.slice(0, 250)}${rec.length > 250 ? '…' : ''}`
            : `I have cast my votes for the best architectural components across all proposals.`
          addLog(recText, payload.from_agent)
          return {
            agents,
            votes: [...state.votes, { from_agent: payload.from_agent, recommendation: rec || '' }],
          }
        }

        case 'finaliser.complete':
          updateAgent('AGENT-13', { status: 'done', thinking_text: '' })
          addLog(
            `After reviewing all proposals, critiques, validations, and votes — the definitive architecture is **${payload.pattern?.toUpperCase()}** with ${Math.round((payload.overall_confidence || 0) * 100)}% confidence. ${payload.summary || ''}`,
            'AGENT-13'
          )
          return {
            agents,
            status: 'completed',
            phase: 'Completed',
            finalArchitecture: {
              id: payload.id || 'final',
              pattern: payload.pattern || 'hybrid',
              summary: payload.summary || '',
              why_this_wins: payload.why_this_wins || '',
              data_flow: payload.data_flow || '',
              tech_stack: payload.tech_stack || {},
              components: payload.components || [],
              adr: payload.adr || '',
              risk_register: payload.risk_register || [],
              cost_projection: payload.cost_projection || { monthly_usd: 0, yearly_usd: 0 },
              timeline: payload.timeline || { mvp_weeks: 8, production_weeks: 16, phases: [] },
              mermaid_diagram: payload.mermaid_diagram || '',
              scorecard: payload.scorecard || {},
              overall_confidence: typeof payload.overall_confidence === 'number' ? payload.overall_confidence : 0.75,
            }
          }

        case 'document.ready':
          addLog('Architecture report documents are ready for download (PDF & DOCX).', undefined)
          return { documentUrls: { pdf_url: payload.pdf_url, docx_url: payload.docx_url } }

        case 'session.completed':
          addLog('The debate is complete. All agents have reached their conclusions. ✓', undefined)
          ALL_IDS.forEach(id => updateAgent(id, { status: 'done' }))
          return { agents, status: 'completed', phase: 'Completed' }

        case 'session.failed':
          addLog(`Session failed: ${payload.error}`, undefined, 'Critical')
          return { agents, status: 'failed', phase: 'Failed' }

        default:
          return {}
      }
    })
  },
}))
