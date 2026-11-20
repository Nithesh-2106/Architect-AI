import { useEffect, useRef, useState } from 'react'
import { AgentState } from '../types'
import { useDebateStore } from '../store/debateStore'

interface Props {
  agent: AgentState | null
}

/** Try to detect if text is mostly raw JSON (starts with { or [) */
function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

function cleanThinkingText(text: string): string {
  return text
}

export default function ThinkingPanel({ agent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agent?.thinking_text])

  if (!agent) {
    return (
      <div className="flex-1 rounded border flex items-center justify-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="text-center">
          <div className="text-3xl mb-3">👆</div>
          <p className="text-text3 text-xs">Click an agent card to see their thinking stream</p>
        </div>
      </div>
    )
  }

  const SPECIALIST_IDS = ['AGENT-09', 'AGENT-10', 'AGENT-18', 'AGENT-19']
  const isFinaliser = agent.agent_id === 'AGENT-13'
  const isSpecialist = SPECIALIST_IDS.includes(agent.agent_id)
  const finalArchitecture = useDebateStore(s => s.finalArchitecture)

  const statusLabel = (
    agent.status === 'thinking'  ? (isSpecialist ? 'Analyzing...' : isFinaliser ? 'Synthesizing final architecture...' : 'Generating proposal...') :
    agent.status === 'revising'  ? 'Revising under critique...' :
    agent.status === 'proposed'  ? 'Proposal complete' :
    agent.status === 'voted'     ? 'Vote cast' :
    agent.status === 'done'      ? (isFinaliser ? 'Synthesis complete ✓' : isSpecialist ? 'Analysis complete ✓' : 'Complete') : agent.status
  )

  const isThinking = agent.status === 'thinking' || agent.status === 'revising'
  const cleanedText = cleanThinkingText(agent.thinking_text || '')
  const isJsonOutput = looksLikeJson(agent.thinking_text || '')

  return (
    <div className="flex-1 rounded border flex flex-col min-h-0"
      style={{ background: 'var(--surface)', borderColor: isThinking ? `${agent.color}40` : 'var(--border)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-xl">{agent.emoji}</span>
        <div>
          <div className="font-sans font-bold text-sm text-white">{agent.agent_name}</div>
          <div className="text-xs" style={{ color: agent.color }}>{statusLabel}</div>
        </div>
        {isThinking && (
          <div className="ml-auto agent-dot">
            <span style={{ background: agent.color }}/><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/>
          </div>
        )}
        {agent.thinking_text && isJsonOutput && (
          <button
            onClick={() => setShowRaw(v => !v)}
            className="ml-auto text-[9px] px-2 py-1 rounded transition-all"
            style={{ color: 'var(--text3)', border: '1px solid var(--border)', background: showRaw ? 'var(--surface2)' : 'transparent' }}
          >
            {showRaw ? 'Hide Raw' : 'Raw JSON'}
          </button>
        )}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">

        {/* Live thinking trace (non-JSON) */}
        {isThinking && cleanedText && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">
              {agent.status === 'revising' ? '💭 Revision Reasoning' : '💭 Thinking Trace'}
            </div>
            <pre className="font-mono text-xs text-text2 leading-relaxed whitespace-pre-wrap break-words">
              {cleanedText}
              {isThinking && <span className="thinking-cursor" />}
            </pre>
          </div>
        )}

        {/* Generating JSON indicator */}
        {isThinking && isJsonOutput && !showRaw && (
          <div className="mb-4 rounded p-3 flex items-center gap-2"
            style={{ background: `${agent.color}08`, border: `1px solid ${agent.color}25` }}>
            <div className="agent-dot">
              <span style={{ background: agent.color }}/><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/>
            </div>
            <span className="text-xs" style={{ color: agent.color }}>
              Composing structured proposal...
            </span>
          </div>
        )}

        {/* Raw JSON view */}
        {showRaw && agent.thinking_text && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">Raw Output</div>
            <pre className="font-mono text-[10px] text-text3 leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
              {agent.thinking_text}
              {isThinking && <span className="thinking-cursor" />}
            </pre>
          </div>
        )}

        {/* Structured Proposal — Specialist agents get specialized cards */}
        {agent.proposal && isSpecialist && (
          <div className="mt-3 rounded-lg p-4 space-y-3" style={{ background: `${agent.color}08`, border: `1px solid ${agent.color}25` }}>
            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: agent.color }}>◆ Analysis Complete</div>
            {agent.proposal.summary && (
              <p className="text-xs text-text2 leading-relaxed">{agent.proposal.summary}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {agent.proposal.serving_strategy && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">ML Serving</span>
                  <span className="text-[10px] text-accent font-semibold">{agent.proposal.serving_strategy}</span>
                </div>
              )}
              {agent.proposal.estimated_gpu_cost_monthly !== undefined && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">GPU Cost</span>
                  <span className="text-[10px] text-accent3 font-semibold">${agent.proposal.estimated_gpu_cost_monthly}/mo</span>
                </div>
              )}
              {agent.proposal.energy_efficiency_rating && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Energy Rating</span>
                  <span className="text-[10px] font-semibold" style={{ color: agent.color }}>{agent.proposal.energy_efficiency_rating}</span>
                </div>
              )}
              {agent.proposal.sci_score_estimate && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">SCI Score</span>
                  <span className="text-[10px] font-semibold" style={{ color: agent.color }}>{agent.proposal.sci_score_estimate}</span>
                </div>
              )}
              {agent.proposal.monthly_usd !== undefined && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Monthly Cost</span>
                  <span className="text-[10px] text-accent3 font-semibold">${(agent.proposal.monthly_usd || 0).toLocaleString()}</span>
                </div>
              )}
              {agent.proposal.skill_gap_risk && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Skill-Gap Risk</span>
                  <span className="text-[10px] text-accent5 font-semibold">{agent.proposal.skill_gap_risk}</span>
                </div>
              )}
              {agent.proposal.status && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Status</span>
                  <span className="text-[10px] text-accent3 font-semibold">{agent.proposal.status}</span>
                </div>
              )}
              {agent.proposal.cost_vs_budget && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Budget Status</span>
                  <span className="text-[10px] text-accent5 font-semibold">{agent.proposal.cost_vs_budget}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Finaliser completion card — shows when AGENT-13 is done */}
        {isFinaliser && agent.status === 'done' && finalArchitecture && (
          <div className="mt-3 rounded-lg p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white">⚖️ Final Architecture Decided</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-bold"
                style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
                ◆ {finalArchitecture.pattern?.toUpperCase()}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                {Math.round((finalArchitecture.overall_confidence || 0) * 100)}% confidence
              </span>
            </div>
            <p className="text-[10px] text-text2 leading-relaxed">{finalArchitecture.summary?.slice(0, 280)}{(finalArchitecture.summary?.length || 0) > 280 ? '…' : ''}</p>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {Object.entries(finalArchitecture.tech_stack || {}).slice(0, 4).map(([k, v]) => (
                <div key={k} className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">{k.replace(/_/g,' ')}</span>
                  <span className="text-[9px] text-white font-semibold truncate">{v as string}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-accent text-center mt-1">→ See full results in the Results panel</p>
          </div>
        )}

        {/* Structured Proposal — Architecture agents */}
        {agent.proposal && !isSpecialist && (
          <div className="mt-2 space-y-3">
            <div className="h-px" style={{ background: `linear-gradient(90deg, ${agent.color}40, transparent)` }} />
            
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest" style={{ color: agent.color }}>
                ◆ {agent.proposal.pattern?.toUpperCase()} ARCHITECTURE
              </div>
              {agent.confidence > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${agent.confidence * 100}%`, background: agent.color }} />
                  </div>
                  <span className="text-[10px]" style={{ color: agent.color }}>{Math.round(agent.confidence * 100)}%</span>
                </div>
              )}
            </div>

            <p className="text-xs text-text2 leading-relaxed">{agent.proposal.summary}</p>

            {agent.proposal.justification && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-text3 mt-3">Justification</div>
                <p className="text-xs text-text2 leading-relaxed">{agent.proposal.justification}</p>
              </>
            )}

            {/* Special Metrics for Specialist Agents */}
            <div className="grid grid-cols-2 gap-1.5 mt-3 mb-2">
              {agent.proposal.serving_strategy && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">ML Serving</span>
                  <span className="text-[10px] text-accent font-semibold">{agent.proposal.serving_strategy}</span>
                </div>
              )}
              {agent.proposal.estimated_gpu_cost_monthly !== undefined && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">GPU Cost</span>
                  <span className="text-[10px] text-accent3 font-semibold">${agent.proposal.estimated_gpu_cost_monthly}/mo</span>
                </div>
              )}
              {agent.proposal.energy_efficiency_rating && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Energy Rating</span>
                  <span className="text-[10px] text-accent4 font-semibold">{agent.proposal.energy_efficiency_rating}</span>
                </div>
              )}
              {agent.proposal.sci_score_estimate && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">SCI Score</span>
                  <span className="text-[10px] text-accent4 font-semibold">{agent.proposal.sci_score_estimate}</span>
                </div>
              )}
              {agent.proposal.monthly_usd !== undefined && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Monthly Cost</span>
                  <span className="text-[10px] text-accent3 font-semibold">${agent.proposal.monthly_usd.toLocaleString()}</span>
                </div>
              )}
              {agent.proposal.skill_gap_risk && (
                <div className="flex flex-col px-2 py-1.5 rounded" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-[8px] text-text3 uppercase tracking-wider">Skill-Gap Risk</span>
                  <span className="text-[10px] text-accent5 font-semibold">{agent.proposal.skill_gap_risk}</span>
                </div>
              )}
            </div>

            {/* Tech Stack */}
            {agent.proposal.tech_stack && Object.keys(agent.proposal.tech_stack).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">Tech Stack</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(agent.proposal.tech_stack).map(([k, v]) => (
                    <div key={k} className="flex flex-col px-2 py-1.5 rounded"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <span className="text-[8px] text-text3 uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-text font-semibold truncate">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agent.proposal.trade_offs && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent3 mb-1">Pros</div>
                  {(agent.proposal.trade_offs.pros || []).map((p: string, i: number) => (
                    <div key={i} className="text-xs text-text2 flex gap-1.5 mb-1">
                      <span className="text-accent3 mt-0.5">+</span>{p}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent5 mb-1">Cons</div>
                  {(agent.proposal.trade_offs.cons || []).map((c: string, i: number) => (
                    <div key={i} className="text-xs text-text2 flex gap-1.5 mb-1">
                      <span className="text-accent5 mt-0.5">−</span>{c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agent.critique_received && (
              <div className="mt-3 rounded p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-[10px] uppercase tracking-widest text-accent5 mb-1">
                  🔴 Critique Received ({agent.critique_received.severity})
                </div>
                <p className="text-xs font-semibold text-accent5 mb-1">{agent.critique_received.title}</p>
                <p className="text-xs" style={{ color: '#fca5a5' }}>{agent.critique_received.critique}</p>
              </div>
            )}

            {agent.revision && (
              <div className="mt-3 rounded p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-[10px] uppercase tracking-widest text-accent3 mb-2">✓ After Revision</div>
                {(agent.revision.concessions || []).map((c: string, i: number) => (
                  <div key={i} className="text-xs text-text2 flex gap-1.5 mb-1">
                    <span className="text-accent4">↘</span> Conceded: {c}
                  </div>
                ))}
                {(agent.revision.defenses || []).map((d: string, i: number) => (
                  <div key={i} className="text-xs text-text2 flex gap-1.5 mb-1">
                    <span className="text-accent3">↗</span> Defended: {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {agent.status === 'idle' && (
          <div className="flex items-center justify-center h-20 text-text3 text-xs">
            Waiting for activation...
          </div>
        )}

        {isThinking && !agent.thinking_text && !agent.proposal && (
          <div className="flex items-center gap-2 text-text3 text-xs">
            <div className="agent-dot"><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/></div>
            Initializing...
          </div>
        )}
      </div>
    </div>
  )
}
