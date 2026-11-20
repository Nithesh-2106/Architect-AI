import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDebateStore } from '../store/debateStore'
import { useSessionStream } from '../hooks/useSessionStream'
import AgentCard from '../components/AgentCard'
import ThinkingPanel from '../components/ThinkingPanel'
import DebateLog from '../components/DebateLog'
import BattlePanel from '../components/BattlePanel'
import PhaseTimeline from '../components/PhaseTimeline'
import ResultPanel from '../components/ResultPanel'
import ConversationView from '../components/ConversationView'

const PANELS = ['Think', 'Convo', 'Battle', 'Log'] as const
type Panel = typeof PANELS[number]

export default function DebatePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [rightPanel, setRightPanel] = useState<Panel>('Think')

  const { agents, status, finalArchitecture, documentUrls, phase, convergenceScore, debateLog } = useDebateStore()
  const setFinalArchFromAPI = useDebateStore(s => s.setFinalArchFromAPI)

  // Start SSE stream
  useSessionStream(sessionId || null)

  // On page load (or refresh), if the session is already completed, load the architecture from the API
  useEffect(() => {
    if (!sessionId) return
    const loadFromApi = async () => {
      try {
        const { getSession } = await import('../api/client')
        const session = await getSession(sessionId)
        if (session.architecture && !finalArchitecture) {
          setFinalArchFromAPI(session.architecture, session.architecture.pdf_url, session.architecture.docx_url)
        }
      } catch (_) { /* silent */ }
    }
    loadFromApi()
  }, [sessionId])

  // Auto-select first active agent
  useEffect(() => {
    if (!selectedAgent) {
      const thinking = Object.values(agents).find(a => a.status === 'thinking')
      if (thinking) setSelectedAgent(thinking.agent_id)
    }
  }, [agents, selectedAgent])

  // Auto-switch panels based on phase
  useEffect(() => {
    const hasThinking = Object.values(agents).some(a => a.status === 'thinking' || a.status === 'revising')
    if (hasThinking && rightPanel === 'Log') setRightPanel('Think')
    // Switch to Convo once some log entries accumulate
    if (debateLog.length === 3 && rightPanel === 'Think') setRightPanel('Convo')
  }, [agents, debateLog.length])

  const agentList = Object.values(agents)
  const selectedAgentState = selectedAgent ? agents[selectedAgent] : null
  const activeCount = agentList.filter(a => a.status === 'thinking' || a.status === 'revising').length

  // Merge document URLs from both the live event and the REST API hydration
  const effectivePdfUrl = documentUrls.pdf_url || finalArchitecture?.pdf_url || null
  const effectiveDocxUrl = documentUrls.docx_url || finalArchitecture?.docx_url || null

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="grid-bg" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-4 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'rgba(8,11,16,0.9)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/')}
          className="text-text3 hover:text-text text-xs transition-colors">
          ← Back
        </button>
        <div className="font-sans font-black text-sm text-white" style={{ letterSpacing: '-0.5px' }}>
          Architect<span style={{ color: 'var(--accent)' }}>AI</span>
        </div>
        <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
        <div className="text-xs text-text3 truncate max-w-xs">{sessionId?.slice(0, 8)}...</div>

        {/* Phase */}
        <div className="ml-2">
          <PhaseTimeline />
        </div>

        {/* Status */}
        <div className="ml-auto flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-accent">
              <span className="agent-dot"><span/><span/><span/></span>
              {activeCount} agent{activeCount > 1 ? 's' : ''} thinking
            </div>
          )}
          <div className="text-[10px] px-2 py-1 rounded uppercase tracking-wider border"
            style={{
              color: status === 'completed' ? 'var(--accent3)' : status === 'failed' ? 'var(--accent5)' : 'var(--accent)',
              borderColor: status === 'completed' ? 'rgba(16,185,129,0.3)' : status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,255,0.3)',
              background: status === 'completed' ? 'rgba(16,185,129,0.08)' : status === 'failed' ? 'rgba(239,68,68,0.08)' : 'rgba(0,212,255,0.08)',
            }}>
            {status === 'running' ? phase : status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex min-h-0 gap-0">

        {/* LEFT: Agent grid */}
        <div className="w-56 flex-shrink-0 border-r p-3 overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'rgba(13,17,23,0.6)' }}>
          <div className="text-[9px] uppercase tracking-widest text-text3 mb-2 px-1">
            Agents ({agentList.length})
          </div>
          <div className="space-y-1.5">
            {agentList.map(agent => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                isSelected={selectedAgent === agent.agent_id}
                onClick={() => {
                  setSelectedAgent(agent.agent_id)
                  setRightPanel('Think')
                }}
              />
            ))}
          </div>
        </div>

        {/* CENTER: Result or waiting */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-hidden">
          {finalArchitecture ? (
            <ResultPanel
              arch={finalArchitecture}
              pdfUrl={effectivePdfUrl}
              docxUrl={effectiveDocxUrl}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
              {status === 'running' ? (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 pulse-glow flex items-center justify-center"
                      style={{ borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' }}>
                      <span className="font-sans font-black text-2xl" style={{ color: 'var(--accent)' }}>
                        {agentList.filter(a => a.status !== 'idle').length}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 text-xs bg-surface px-2 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border)' }}>
                      / {agentList.length}
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sans font-black text-xl text-white mb-1">{phase}</h2>
                    <p className="text-text3 text-xs max-w-sm">
                      Agents are debating your architecture. Select any agent on the left to see their real-time thinking stream.
                    </p>
                  </div>
                  {convergenceScore > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text3">Convergence</span>
                      <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${convergenceScore * 100}%`, background: 'var(--accent3)' }} />
                      </div>
                      <span className="text-xs text-accent3 font-bold">{Math.round(convergenceScore * 100)}%</span>
                    </div>
                  )}
                  <p className="text-[10px] text-text3 font-mono">
                    Session: {sessionId}
                  </p>
                </>
              ) : status === 'failed' ? (
                <div className="text-center">
                  <div className="text-4xl mb-3">❌</div>
                  <h2 className="font-sans font-bold text-xl text-accent5 mb-2">Session Failed</h2>
                  <p className="text-text3 text-xs mb-4">An error occurred during the debate. Check the log for details.</p>
                  <button onClick={() => navigate('/')}
                    className="px-4 py-2 rounded text-sm font-sans font-bold uppercase tracking-wider"
                    style={{ background: 'var(--accent)', color: '#080b10' }}>
                    Start New Session
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-3">⏳</div>
                  <p className="text-text3 text-xs">Initializing...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Thinking / Convo / Battle / Log panels */}
        <div
          className="flex-shrink-0 border-l flex flex-col transition-all duration-300"
          style={{
            width: rightPanel === 'Convo' ? '420px' : '320px',
            borderColor: 'var(--border)',
            background: 'rgba(13,17,23,0.6)',
          }}
        >
          {/* Panel switcher */}
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {PANELS.map(p => (
              <button key={p} onClick={() => setRightPanel(p)}
                className="flex-1 py-2 text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                style={{
                  color: rightPanel === p ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: rightPanel === p ? '2px solid var(--accent)' : '2px solid transparent',
                  background: rightPanel === p ? 'rgba(0,212,255,0.04)' : 'transparent',
                }}>
                {p}
                {p === 'Convo' && debateLog.filter(l => l.event_type !== 'agent.thinking').length > 0 && (
                  <span
                    className="text-[8px] px-1 rounded-full"
                    style={{ background: 'rgba(0,212,255,0.2)', color: 'var(--accent)' }}
                  >
                    {debateLog.filter(l => l.event_type !== 'agent.thinking').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 flex flex-col" style={{ padding: rightPanel === 'Convo' ? 0 : '12px' }}>
            {rightPanel === 'Think' && (
              <ThinkingPanel agent={selectedAgentState} />
            )}
            {rightPanel === 'Convo' && <ConversationView />}
            {rightPanel === 'Battle' && <BattlePanel />}
            {rightPanel === 'Log' && <DebateLog />}
          </div>
        </div>
      </div>
    </div>
  )
}
