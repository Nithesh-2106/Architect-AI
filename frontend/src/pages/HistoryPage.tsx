import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSessions } from '../api/client'
import { SessionSummary } from '../types'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const statusColor = (s: string) =>
    s === 'completed' ? 'var(--accent3)' : s === 'failed' ? 'var(--accent5)' : 'var(--accent)'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="grid-bg" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate('/')} className="text-text3 hover:text-text text-xs transition-colors mb-3 block">
              ← Back
            </button>
            <h1 className="font-sans font-black text-3xl text-white" style={{ letterSpacing: '-1px' }}>
              Session <span style={{ color: 'var(--accent)' }}>History</span>
            </h1>
            <p className="text-text3 text-xs mt-1">{sessions.length} sessions stored</p>
          </div>
          <button onClick={() => navigate('/')}
            className="px-4 py-2 rounded font-sans font-bold text-xs uppercase tracking-wider"
            style={{ background: 'var(--accent)', color: '#080b10' }}>
            + New Session
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-text3 text-xs">
            <span className="agent-dot"><span/><span/><span/></span>
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="text-text3 text-sm">No sessions yet. Start your first architecture debate!</p>
            <button onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 rounded font-sans font-bold text-sm uppercase tracking-wider"
              style={{ background: 'var(--accent)', color: '#080b10' }}>
              Start Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <button key={s.id} onClick={() => navigate(`/debate/${s.id}`)}
                className="w-full text-left rounded border p-4 transition-all hover:border-accent/30 group"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-sans font-bold text-sm text-white truncate group-hover:text-accent transition-colors">
                        {s.project_name}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded uppercase tracking-widest flex-shrink-0"
                        style={{
                          color: statusColor(s.status),
                          background: `${statusColor(s.status)}15`,
                          border: `1px solid ${statusColor(s.status)}30`,
                        }}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-text3">
                      <span>{s.current_phase}</span>
                      {s.convergence_score > 0 && (
                        <span>Convergence: {Math.round(s.convergence_score * 100)}%</span>
                      )}
                      <span>{new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                  <div className="text-text3 text-xs flex-shrink-0 group-hover:text-accent transition-colors">
                    {s.has_architecture ? '✓ Architecture Ready' : '→'}
                  </div>
                </div>
                {s.has_architecture && (
                  <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${s.convergence_score * 100}%`,
                      background: 'linear-gradient(90deg, var(--accent), var(--accent3))',
                    }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
