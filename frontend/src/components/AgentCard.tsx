import { AgentState } from '../types'

interface Props {
  agent: AgentState
  isSelected: boolean
  onClick: () => void
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'IDLE', thinking: 'THINKING', proposed: 'PROPOSED',
  revising: 'REVISING', voted: 'VOTED', done: 'DONE',
}

export default function AgentCard({ agent, isSelected, onClick }: Props) {
  const { status, agent_name, emoji, color, confidence, thinking_text } = agent

  const statusColor =
    status === 'thinking' || status === 'revising' ? 'var(--accent)' :
    status === 'proposed' || status === 'voted' ? 'var(--accent3)' :
    status === 'done' ? 'var(--accent3)' :
    'var(--text3)'

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded border transition-all duration-200 p-3 relative overflow-hidden"
      style={{
        background: isSelected ? 'rgba(0,212,255,0.06)' : 'var(--surface)',
        borderColor: isSelected ? 'rgba(0,212,255,0.4)' : 'var(--border)',
        boxShadow: isSelected ? '0 0 12px rgba(0,212,255,0.1)' : 'none',
      }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 transition-all"
        style={{ background: status !== 'idle' ? `linear-gradient(90deg, ${color}, transparent)` : 'transparent' }} />

      {/* Pulse indicator for active agents */}
      {(status === 'thinking' || status === 'revising') && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full pulse-glow"
          style={{ background: 'var(--accent)' }} />
      )}

      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-sans font-semibold text-white truncate">{agent_name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] uppercase tracking-widest" style={{ color: statusColor }}>
              {STATUS_LABELS[status] || status}
            </span>
            {confidence > 0 && (
              <span className="text-[9px] text-text3">{Math.round(confidence * 100)}%</span>
            )}
          </div>

          {/* Confidence bar */}
          {confidence > 0 && (
            <div className="h-0.5 bg-surface3 rounded mt-1.5 overflow-hidden">
              <div className="h-full rounded transition-all duration-500"
                style={{ width: `${confidence * 100}%`, background: color }} />
            </div>
          )}

          {/* Thinking text preview */}
          {(status === 'thinking' || status === 'revising') && thinking_text && (
            <div className="mt-2 text-[9px] text-text3 font-mono line-clamp-2 leading-relaxed thinking-cursor">
              {thinking_text.slice(-120)}
            </div>
          )}

          {/* Proposal summary */}
          {status === 'proposed' && agent.proposal && (
            <div className="mt-1.5">
              <span className="text-[9px] border rounded px-1.5 py-0.5 uppercase tracking-wider"
                style={{ borderColor: `${color}40`, color }}>
                {agent.proposal.pattern || 'proposal'}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
