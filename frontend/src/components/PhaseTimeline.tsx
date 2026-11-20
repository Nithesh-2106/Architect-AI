import { useDebateStore } from '../store/debateStore'

const PHASES = [
  { id: 'P1', label: 'Proposals', desc: 'Independent' },
  { id: 'P2', label: 'Critique', desc: "Devil's Advocate" },
  { id: 'P3', label: 'Validate', desc: 'Tech & Cost' },
  { id: 'P4', label: 'Revise', desc: 'Under Pressure' },
  { id: 'P5', label: 'Vote', desc: 'Cross-Agent' },
  { id: 'P6', label: 'Finalise', desc: 'Synthesis' },
  { id: 'P7', label: 'Docs', desc: 'Generate' },
]

export default function PhaseTimeline() {
  const { phaseHistory, convergenceScore, status } = useDebateStore()
  const completedPhases = new Set(phaseHistory.map(p => p.phase))
  const currentPhase = phaseHistory[phaseHistory.length - 1]?.phase

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {PHASES.map((phase, i) => {
        const done = completedPhases.has(phase.id) && phase.id !== currentPhase
        const active = phase.id === currentPhase
        const pending = !completedPhases.has(phase.id)

        return (
          <div key={phase.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1 px-3">
              <div className="w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all"
                style={{
                  background: done ? 'var(--accent3)' : active ? 'rgba(0,212,255,0.15)' : 'var(--surface2)',
                  borderColor: done ? 'var(--accent3)' : active ? 'var(--accent)' : 'var(--border)',
                  color: done ? '#080b10' : active ? 'var(--accent)' : 'var(--text3)',
                  boxShadow: active ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
                }}>
                {done ? '✓' : phase.id.replace('P', '')}
              </div>
              <div className="text-center">
                <div className="text-[9px] font-sans font-semibold leading-none"
                  style={{ color: done ? 'var(--accent3)' : active ? 'var(--accent)' : 'var(--text3)' }}>
                  {phase.label}
                </div>
                <div className="text-[8px] text-text3 leading-none mt-0.5">{phase.desc}</div>
              </div>
            </div>
            {i < PHASES.length - 1 && (
              <div className="w-6 h-px" style={{
                background: done ? 'var(--accent3)' : 'var(--border)'
              }} />
            )}
          </div>
        )
      })}

      {/* Convergence */}
      {convergenceScore > 0 && (
        <div className="ml-6 flex items-center gap-2">
          <div className="text-[9px] uppercase tracking-widest text-text3">Convergence</div>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${convergenceScore * 100}%`, background: 'var(--accent3)' }} />
          </div>
          <div className="text-[10px] text-accent3 font-bold">{Math.round(convergenceScore * 100)}%</div>
        </div>
      )}
    </div>
  )
}
