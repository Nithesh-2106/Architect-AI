export interface ProjectBrief {
  project_name: string
  project_description: string
  company_stage: 'startup' | 'scaleup' | 'enterprise'
  team_size: number
  team_skills: string[]
  budget_monthly_usd: number
  timeline_months: number
  expected_dau_launch: number
  expected_dau_1year: number
  non_functionals: string[]
  priority_axis: { speed: number; scalability: number; cost: number }
  has_existing_system: boolean
  existing_system_description: string
}

export interface AgentInfo {
  id: string
  name: string
  emoji: string
  color: string
}

export interface DebateEvent {
  id: string
  type: string
  payload: any
  session_id: string
  seq: number
  ts: number
}

export interface AgentState {
  agent_id: string
  agent_name: string
  emoji: string
  color: string
  status: 'idle' | 'thinking' | 'proposed' | 'revising' | 'voted' | 'done'
  thinking_text: string
  proposal: any | null
  confidence: number
  critique_received: any | null
  revision: any | null
  votes_cast: number
}

export interface DebateMessage {
  id: string
  from_agent: string
  to_agent: string | null
  type: string
  content: string
  round: number
  seq: number
  created_at: string
}

export interface FinalArchitecture {
  id: string
  pattern: string
  summary: string
  why_this_wins?: string
  data_flow?: string
  tech_stack: Record<string, string>
  components: Array<{ name: string; tech: string; purpose: string; deployment?: string }>
  adr: string
  risk_register: Array<{ risk: string; severity: string; likelihood?: string; mitigation: string }>
  cost_projection: { monthly_usd: number; yearly_usd: number; breakdown?: Record<string, string | number> }
  timeline: { mvp_weeks: number; production_weeks: number; phases: Array<{ name: string; duration_weeks: number; deliverables: string[] }> }
  mermaid_diagram: string
  scorecard: Record<string, number | { score: number; max: number; notes: string }>
  overall_confidence: number
  pdf_url?: string | null
  docx_url?: string | null
}

export interface SessionSummary {
  id: string
  project_name: string
  status: 'running' | 'completed' | 'failed'
  current_phase: string
  convergence_score: number
  created_at: string
  has_architecture: boolean
}

export const AGENT_META: Record<string, { emoji: string; color: string }> = {
  'AGENT-01': { emoji: '🏗️', color: '#00d4ff' },
  'AGENT-02': { emoji: '🧱', color: '#7c3aed' },
  'AGENT-03': { emoji: '☁️', color: '#f59e0b' },
  'AGENT-04': { emoji: '🔐', color: '#ef4444' },
  'AGENT-05': { emoji: '⚡', color: '#10b981' },
  'AGENT-06': { emoji: '🗄️', color: '#06b6d4' },
  'AGENT-07': { emoji: '🔧', color: '#8b5cf6' },
  'AGENT-08': { emoji: '🔴', color: '#ff6b6b' },
  'AGENT-09': { emoji: '🔍', color: '#64ffda' },
  'AGENT-10': { emoji: '💰', color: '#ffd166' },
  'AGENT-11': { emoji: '🔄', color: '#a8dadc' },
  'AGENT-12': { emoji: '📊', color: '#c77dff' },
  'AGENT-13': { emoji: '⚖️', color: '#ffffff' },
  // New Visionaries
  'AGENT-14': { emoji: '📨', color: '#ff9500' },
  'AGENT-15': { emoji: '🤖', color: '#a855f7' },
  'AGENT-16': { emoji: '⚡️', color: '#06b6d4' },
  'AGENT-17': { emoji: '🧰', color: '#6b7280' },
  // New Specialists
  'AGENT-18': { emoji: '🧠', color: '#8b5cf6' },
  'AGENT-19': { emoji: '🌱', color: '#22c55e' },
  'SYSTEM':   { emoji: '⚙️', color: '#64748b' },
}
