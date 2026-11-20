import { useEffect, useRef } from 'react'
import { useDebateStore } from '../store/debateStore'
import { AGENT_META } from '../types'

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
  'AGENT-14': 'Event-Driven Prophet',
  'AGENT-15': 'AI-Native Architect',
  'AGENT-16': 'Edge-First Specialist',
  'AGENT-17': 'Boring Tech Pragmatist',
  'AGENT-18': 'AI/ML Infrastructure Engineer',
  'AGENT-19': 'Sustainability Architect',
}

const PHASE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'phase.started': { label: 'Phase', color: '#00d4ff', icon: '◆' },
  'agent.proposal.draft':  { label: 'Proposal', color: '#10b981', icon: '🏛️' },
  'agent.critique.issued': { label: 'Critique', color: '#ff6b6b', icon: '⚔️' },
  'agent.proposal.revised': { label: 'Revision', color: '#f59e0b', icon: '✏️' },
  'validation.result':     { label: 'Validation', color: '#64ffda', icon: '🔍' },
  'cost.projection':       { label: 'Cost Analysis', color: '#ffd166', icon: '💰' },
  'convergence.score':     { label: 'Convergence', color: '#7c3aed', icon: '🎯' },
  'agent.vote.cast':       { label: 'Vote', color: '#c77dff', icon: '🗳️' },
  'finaliser.complete':    { label: 'Final Decision', color: '#ffffff', icon: '⚖️' },
  'session.completed':     { label: 'Session Complete', color: '#10b981', icon: '✅' },
  'ml.infrastructure.ready': { label: 'ML Analysis', color: '#8b5cf6', icon: '🧠' },
  'sustainability.scored': { label: 'Green Score', color: '#22c55e', icon: '🌱' },
}

interface ConvMsg {
  id: string
  agent_id: string
  event_type: string
  content: string
  timestamp: number
  color: string
  emoji: string
  meta?: string
  isPhaseMarker?: boolean
  phaseLabel?: string
}

function buildConversation(debateLog: any[]): ConvMsg[] {
  const msgs: ConvMsg[] = []

  debateLog.forEach((log, idx) => {
    const meta = AGENT_META[log.from_agent] || AGENT_META['SYSTEM'] || { emoji: '⚙️', color: '#64748b' }
    const ph = PHASE_LABELS[log.event_type]

    // Phase markers become dividers
    if (log.event_type === 'phase.started') {
      msgs.push({
        id: log.id,
        agent_id: 'SYSTEM',
        event_type: log.event_type,
        content: log.content,
        timestamp: log.timestamp,
        color: '#00d4ff',
        emoji: '◆',
        isPhaseMarker: true,
        phaseLabel: log.content,
      })
      return
    }

    // Skip raw thinking tokens — they show in ThinkingPanel; only show milestones
    if (log.event_type === 'agent.thinking') return

    // Build human-readable content for each event type
    let content = log.content
    let metaStr: string | undefined

    if (log.event_type === 'agent.proposal.draft' || log.event_type === 'agent.proposal.revised') {
      content = log.content
      metaStr = ph?.label
    } else if (log.event_type === 'agent.critique.issued') {
      content = log.content
      metaStr = 'Critique'
    } else if (log.event_type === 'convergence.score') {
      content = log.content
      metaStr = 'Score Update'
    } else if (log.event_type === 'agent.vote.cast') {
      content = log.content.length > 200 ? log.content.slice(0, 200) + '…' : log.content
      metaStr = 'Vote Cast'
    } else if (log.event_type === 'validation.result') {
      content = log.content
      metaStr = 'Validation'
    } else if (log.event_type === 'cost.projection') {
      content = log.content
      metaStr = 'Cost'
    } else if (log.event_type === 'session.completed') {
      content = 'The debate is complete. Final architecture synthesized.'
      metaStr = 'Done'
    } else if (log.event_type === 'finaliser.complete') {
      content = log.content
      metaStr = 'Final'
    } else if (log.event_type === 'ml.infrastructure.ready') {
      content = log.content
      metaStr = 'ML'
    } else if (log.event_type === 'sustainability.scored') {
      content = log.content
      metaStr = 'Green'
    }

    msgs.push({
      id: log.id,
      agent_id: log.from_agent,
      event_type: log.event_type,
      content,
      timestamp: log.timestamp,
      color: meta.color,
      emoji: meta.emoji,
      meta: metaStr,
    })
  })

  return msgs
}

function EventBadge({ type }: { type: string }) {
  const ph = PHASE_LABELS[type]
  if (!ph) return null
  return (
    <span
      className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold"
      style={{ background: `${ph.color}18`, color: ph.color, border: `1px solid ${ph.color}35` }}
    >
      {ph.icon} {ph.label}
    </span>
  )
}

/** Parse **bold** markdown into JSX */
function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function AgentBubble({ msg }: { msg: ConvMsg }) {
  const name = AGENT_NAMES[msg.agent_id] || msg.agent_id
  const isSystem = msg.agent_id === 'SYSTEM'

  if (isSystem) return null

  // Critiques get a distinct attack-style layout
  const isAttack = msg.event_type === 'agent.critique.issued'
  const isFinal = msg.agent_id === 'AGENT-13'

  return (
    <div className="flex gap-3 slide-in">
      {/* Avatar */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{
            background: `${msg.color}18`,
            border: `2px solid ${msg.color}55`,
            boxShadow: `0 0 10px ${msg.color}22`,
          }}
        >
          {msg.emoji}
        </div>
        <div className="w-px flex-1 min-h-0" style={{ background: `${msg.color}20`, minHeight: 8 }} />
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest"
              style={{ background: `${msg.color}15`, color: msg.color, border: `1px solid ${msg.color}30` }}>
              {msg.agent_id}
            </span>
            <span className="text-[12px] font-sans font-bold" style={{ color: msg.color }}>{name}</span>
          </div>
          {msg.meta && <EventBadge type={msg.event_type} />}
          <span className="text-[9px] text-text3 ml-auto">
            {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div
          className="rounded-lg px-4 py-3 text-xs text-text2 leading-relaxed"
          style={{
            background: isAttack
              ? 'rgba(239,68,68,0.07)'
              : isFinal
              ? 'rgba(255,255,255,0.05)'
              : `${msg.color}09`,
            border: isAttack
              ? '1px solid rgba(239,68,68,0.25)'
              : isFinal
              ? '1px solid rgba(255,255,255,0.15)'
              : `1px solid ${msg.color}22`,
          }}
        >
          {msg.content
            ? <span className="conv-text">{parseBold(msg.content)}</span>
            : <span className="italic text-text3">(no content)</span>}
        </div>
      </div>
    </div>
  )
}

function PhaseDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #00d4ff30)' }} />
      <div
        className="text-[9px] uppercase tracking-widest px-3 py-1 rounded-full font-bold"
        style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
      >
        ◆ {label}
      </div>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #00d4ff30, transparent)' }} />
    </div>
  )
}

export default function ConversationView() {
  const debateLog = useDebateStore(s => s.debateLog)
  const status = useDebateStore(s => s.status)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [debateLog.length])

  const messages = buildConversation(debateLog)

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
        <div className="text-5xl">💬</div>
        <div>
          <p className="text-text2 text-sm font-sans font-bold mb-1">Agent Conversation</p>
          <p className="text-text3 text-xs max-w-xs">
            Once the debate starts, you'll see every agent speak in real time — proposals, critiques, revisions, votes, and the final verdict.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="max-w-2xl mx-auto space-y-0">
        {messages.map(msg =>
          msg.isPhaseMarker ? (
            <PhaseDivider key={msg.id} label={msg.phaseLabel || ''} />
          ) : (
            <AgentBubble key={msg.id} msg={msg} />
          )
        )}
        {status === 'running' && (
          <div className="flex items-center gap-3 py-2 px-4">
            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-base" style={{ borderColor: '#00d4ff40', background: 'rgba(0,212,255,0.06)' }}>
              ⚙️
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text3">
              <span className="agent-dot"><span/><span/><span/></span>
              Agents deliberating...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
