import { useEffect, useRef } from 'react'
import { useDebateStore } from '../store/debateStore'
import { AGENT_META } from '../types'

const SEV_COLOR: Record<string, string> = {
  Critical: '#ef4444', Major: '#f59e0b', Minor: '#64748b',
  warning: '#f59e0b', UNVERIFIED: '#f59e0b',
}

export default function DebateLog() {
  const log = useDebateStore(s => s.debateLog)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrolled = useRef(false)

  useEffect(() => {
    if (!isUserScrolled.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isUserScrolled.current = scrollHeight - scrollTop - clientHeight > 40
  }

  return (
    <div className="flex flex-col h-full rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] uppercase tracking-widest text-accent">◆ Debate Log</div>
        <div className="text-[10px] text-text3">{log.length} events</div>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {log.length === 0 && (
          <div className="flex items-center justify-center h-full text-text3 text-xs">
            Waiting for agents...
          </div>
        )}
        {log.map((entry) => {
          const meta = AGENT_META[entry.from_agent] || { emoji: '⚙️', color: '#64748b' }
          const sevColor = entry.severity ? SEV_COLOR[entry.severity] : undefined
          return (
            <div key={entry.id} className="slide-in flex gap-2.5 group">
              <span className="text-sm leading-none mt-0.5 flex-shrink-0">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[9px] font-sans font-bold uppercase tracking-wider"
                    style={{ color: meta.color }}>
                    {entry.from_agent === 'SYSTEM' ? 'SYSTEM' : entry.from_agent}
                  </span>
                  {sevColor && (
                    <span className="text-[8px] uppercase tracking-widest px-1.5 rounded"
                      style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}30` }}>
                      {entry.severity}
                    </span>
                  )}
                  <span className="text-[8px] text-text3 ml-auto flex-shrink-0">
                    {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[10px] text-text2 leading-relaxed mt-0.5">{entry.content}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
