import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { emoji: '🧠', title: 'Real-Time Thinking', desc: 'Watch every agent reason token-by-token as they design architecture' },
  { emoji: '⚔️', title: 'Agent Battle', desc: "Devil's Advocate tears apart every proposal with surgical precision" },
  { emoji: '🔍', title: 'Tech Validation', desc: 'Validator checks all tech claims and skill-fit for your team' },
  { emoji: '💰', title: 'Cost Modelling', desc: 'Realistic 12-month TCO for every proposed architecture' },
  { emoji: '⚖️', title: 'Synthesis', desc: 'Finaliser merges the best elements from all proposals' },
  { emoji: '📄', title: 'Full Reports', desc: 'Download complete architecture reports as PDF and DOCX' },
]

const AGENT_PHASES = [
  {
    name: "Phase 1: Visionaries",
    desc: "Drafting competing architectures",
    agents: [
      { id: '01', name: 'Microservices Advocate', emoji: '🏗️', color: '#00d4ff' },
      { id: '02', name: 'Monolith Defender', emoji: '🧱', color: '#7c3aed' },
      { id: '03', name: 'Serverless Evangelist', emoji: '☁️', color: '#f59e0b' },
      { id: '14', name: 'Event-Driven Prophet', emoji: '📨', color: '#ff9500' },
      { id: '15', name: 'AI-Native Architect', emoji: '🤖', color: '#a855f7' },
      { id: '16', name: 'Edge-First Specialist', emoji: '⚡️', color: '#06b6d4' },
      { id: '17', name: 'Boring Tech Pragmatist', emoji: '🧰', color: '#6b7280' },
    ]
  },
  {
    name: "Phase 2: The Attack",
    desc: "Finding fatal flaws",
    agents: [
      { id: '08', name: "Devil's Advocate", emoji: '🔴', color: '#ff6b6b' },
    ]
  },
  {
    name: "Phase 3: Deep Analysis",
    desc: "Validating claims & costs",
    agents: [
      { id: '04', name: 'Security Auditor', emoji: '🔐', color: '#ef4444' },
      { id: '05', name: 'Performance Engineer', emoji: '⚡', color: '#10b981' },
      { id: '06', name: 'Data Architect', emoji: '🗄️', color: '#06b6d4' },
      { id: '07', name: 'DevOps Engineer', emoji: '🔧', color: '#8b5cf6' },
      { id: '09', name: 'Tech Validator', emoji: '🔍', color: '#64ffda' },
      { id: '10', name: 'Cost Analyst', emoji: '💰', color: '#ffd166' },
      { id: '18', name: 'AI/ML Infra Engineer', emoji: '🧠', color: '#8b5cf6' },
      { id: '19', name: 'Sustainability Architect', emoji: '🌱', color: '#22c55e' },
    ]
  },
  {
    name: "Phase 4: Strategy & Voting",
    desc: "Migration planning & consensus",
    agents: [
      { id: '11', name: 'Migration Strategist', emoji: '🔄', color: '#a8dadc' },
      { id: '12', name: 'Observability Architect', emoji: '📊', color: '#c77dff' },
      { id: 'VOTE', name: 'All Agents Vote', emoji: '🗳️', color: '#c77dff' },
    ]
  },
  {
    name: "Phase 5: Synthesis",
    desc: "Final architectural decision",
    agents: [
      { id: '13', name: 'Architect Finaliser', emoji: '⚖️', color: '#ffffff' },
    ]
  }
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="grid-bg" />
      <div className="relative z-10">

        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(8,11,16,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="font-sans font-black text-xl text-white" style={{ letterSpacing: '-1px' }}>
            Architect<span style={{ color: 'var(--accent)' }}>AI</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/history')}
              className="px-3 py-1.5 rounded text-xs text-text3 hover:text-text border border-transparent hover:border-border transition-all">
              History
            </button>
            <button onClick={() => navigate('/setup')}
              className="px-4 py-1.5 rounded text-xs font-sans font-bold uppercase tracking-wider transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#080b10' }}>
              Launch Debate →
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 border border-accent/20 bg-accent/5 px-3 py-1 rounded text-accent text-[10px] tracking-widest uppercase mb-6">
            <span>◆</span> 19 Specialised AI Agents
          </div>
          <h1 className="font-sans font-black text-white mb-4"
            style={{ fontSize: 'clamp(40px,6vw,80px)', letterSpacing: '-3px', lineHeight: 1.0 }}>
            Architecture
            <br />
            <span style={{ color: 'var(--accent)' }}>Designed</span> by
            <br />
            Agent Debate
          </h1>
          <p className="font-serif italic text-lg text-text2 max-w-2xl mx-auto mb-8 leading-relaxed">
            Watch 19 AI specialists debate, fight, revise, and converge on the optimal
            architecture for your project — with full transparency into every agent's reasoning.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/setup')}
              className="px-8 py-3 rounded font-sans font-bold text-sm uppercase tracking-wider transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#080b10' }}>
              ◆ Start Architecture Debate
            </button>
            <button onClick={() => navigate('/history')}
              className="px-8 py-3 rounded font-sans font-bold text-sm uppercase tracking-wider transition-all border"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
              View History
            </button>
          </div>
        </div>

        {/* Agent pipeline */}
        <div className="max-w-6xl mx-auto px-8 pb-20">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-widest text-text3">The 19-Agent Architecture Pipeline</div>
          </div>
          
          <div className="flex flex-col gap-4">
            {AGENT_PHASES.map((phase, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-4 items-stretch">
                {/* Phase Label */}
                <div 
                  className="md:w-64 rounded-xl p-4 flex flex-col justify-center border"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold text-accent mb-1">{phase.name}</div>
                  <div className="text-[11px] text-text3 leading-snug">{phase.desc}</div>
                </div>
                
                {/* Flow Arrow (Desktop) */}
                <div className="hidden md:flex items-center justify-center text-border text-lg w-8">
                  →
                </div>
                
                {/* Agents */}
                <div className="flex-1 flex flex-wrap gap-2">
                  {phase.agents.map(a => (
                    <div key={a.id} className="rounded border p-2.5 flex items-center gap-3 transition-all hover:border-opacity-50 group flex-1 min-w-[140px] max-w-[200px]"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="text-xl flex-shrink-0" style={{ filter: `drop-shadow(0 0 8px ${a.color}40)` }}>{a.emoji}</div>
                      <div className="text-[9px] font-sans font-bold uppercase tracking-wide leading-tight"
                        style={{ color: a.color }}>
                        {a.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="max-w-5xl mx-auto px-8 pb-20">
          <div className="text-center mb-8">
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">What You Get</div>
            <h2 className="font-sans font-black text-2xl text-white">Full Transparency. Zero Black Boxes.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded border p-5"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="text-2xl mb-3">{f.emoji}</div>
                <div className="font-sans font-bold text-sm text-white mb-1">{f.title}</div>
                <div className="text-xs text-text2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t text-center py-8 text-text3 text-[10px] tracking-widest"
          style={{ borderColor: 'var(--border)' }}>
          ARCHITECTAI · MULTI-AGENT ARCHITECTURE DESIGN · POWERED BY CLAUDE
        </div>
      </div>
    </div>
  )
}
