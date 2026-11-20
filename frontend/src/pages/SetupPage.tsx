import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../api/client'
import { ProjectBrief } from '../types'
import { useDebateStore } from '../store/debateStore'

const SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Node.js',
  'React', 'Vue', 'Next.js', 'FastAPI', 'Django', 'Spring Boot',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'GraphQL']

const NON_FUNCTIONALS = ['GDPR compliance', 'HIPAA compliance', 'SOC2', 'PCI-DSS',
  '99.99% uptime SLA', '99.999% uptime SLA', 'Sub-100ms latency', 'Sub-500ms latency',
  'Multi-region', 'Data residency (EU)', 'Zero-downtime deployments', 'WCAG 2.1 AA']

const Field = ({ label, children, id }: { label: string; children: React.ReactNode; id?: string }) => (
  <div>
    <label htmlFor={id} className="block text-xs uppercase tracking-widest text-accent3 mb-2 cursor-pointer">{label}</label>
    {children}
  </div>
)

const inputCls = "relative z-20 w-full bg-surface2 border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors cursor-text"

export default function SetupPage() {
  const navigate = useNavigate()
  const resetDebate = useDebateStore(s => s.resetDebate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [brief, setBrief] = useState<ProjectBrief>({
    project_name: '',
    project_description: '',
    company_stage: 'startup',
    team_size: 5,
    team_skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
    budget_monthly_usd: 1000,
    timeline_months: 4,
    expected_dau_launch: 1000,
    expected_dau_1year: 50000,
    non_functionals: ['99.99% uptime SLA'],
    priority_axis: { speed: 0.5, scalability: 0.3, cost: 0.2 },
    has_existing_system: false,
    existing_system_description: '',
  })

  const toggleSkill = (s: string) => setBrief(b => ({
    ...b,
    team_skills: b.team_skills.includes(s)
      ? b.team_skills.filter(x => x !== s)
      : [...b.team_skills, s],
  }))

  const toggleNF = (s: string) => setBrief(b => ({
    ...b,
    non_functionals: b.non_functionals.includes(s)
      ? b.non_functionals.filter(x => x !== s)
      : [...b.non_functionals, s],
  }))

  const handleSubmit = async () => {
    if (!brief.project_name.trim()) { setError('Project name is required'); return }
    if (!brief.project_description.trim()) { setError('Project description is required'); return }
    if (brief.team_skills.length === 0) { setError('Select at least one skill'); return }
    setError('')
    setLoading(true)
    try {
      resetDebate()
      const { session_id } = await createSession(brief)
      navigate(`/debate/${session_id}`)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="grid-bg" />
      <div className="relative z-30 max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 border border-accent/20 bg-accent/5 px-3 py-1 rounded text-accent text-xs tracking-widest uppercase mb-4">
            <span>◆</span> New Architecture Session
          </div>
          <h1 className="font-sans text-4xl font-black text-white mb-2" style={{ letterSpacing: '-1.5px' }}>
            Configure Your <span style={{ color: 'var(--accent)' }}>Project</span>
          </h1>
          <p className="font-serif italic text-text2 text-base">
            19 AI agents will debate your architecture in real time.
          </p>
        </div>

        <div className="space-y-6">
          {/* Project basics */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-sans font-bold text-white text-sm uppercase tracking-widest">Project Basics</h2>
            <Field label="Project Name" id="project_name">
              <input id="project_name" className={inputCls} value={brief.project_name}
                onChange={e => setBrief(b => ({ ...b, project_name: e.target.value }))}
                placeholder="e.g. RealTime Food Delivery Marketplace" />
            </Field>
            <Field label="Project Description" id="project_description">
              <textarea id="project_description" className={inputCls} rows={4} value={brief.project_description}
                onChange={e => setBrief(b => ({ ...b, project_description: e.target.value }))}
                placeholder="Describe what your product does, who uses it, core workflows, and any specific technical requirements..." />
            </Field>
          </div>

          {/* Company & Team */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-sans font-bold text-white text-sm uppercase tracking-widest">Company & Team</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Stage">
                <select className={inputCls} value={brief.company_stage}
                  onChange={e => setBrief(b => ({ ...b, company_stage: e.target.value as any }))}>
                  <option value="startup">Startup (pre-series A)</option>
                  <option value="scaleup">Scaleup (series A–C)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label={`Team Size: ${brief.team_size} engineers`}>
                <input type="range" min={1} max={100} value={brief.team_size} className="w-full mt-2"
                  onChange={e => setBrief(b => ({ ...b, team_size: parseInt(e.target.value) }))} />
                <div className="flex justify-between text-xs text-text3 mt-1"><span>1</span><span>100</span></div>
              </Field>
            </div>
            <Field label="Team Skills (select all that apply)">
              <div className="flex flex-wrap gap-2 mt-1">
                {SKILLS.map(s => (
                  <button key={s} onClick={() => toggleSkill(s)}
                    className={`px-2 py-1 rounded text-xs border transition-all ${
                      brief.team_skills.includes(s)
                        ? 'bg-accent/10 border-accent/40 text-accent'
                        : 'bg-surface2 border-border text-text3 hover:border-text3'
                    }`}>{s}</button>
                ))}
              </div>
            </Field>
          </div>

          {/* Budget & Timeline */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="font-sans font-bold text-white text-sm uppercase tracking-widest">Budget & Timeline</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Monthly Budget: $${brief.budget_monthly_usd.toLocaleString()}`}>
                <input type="range" min={100} max={50000} step={100} value={brief.budget_monthly_usd}
                  onChange={e => setBrief(b => ({ ...b, budget_monthly_usd: parseInt(e.target.value) }))} className="w-full mt-2" />
                <div className="flex justify-between text-xs text-text3 mt-1"><span>$100</span><span>$50k</span></div>
              </Field>
              <Field label={`Timeline: ${brief.timeline_months} months`}>
                <input type="range" min={1} max={24} value={brief.timeline_months}
                  onChange={e => setBrief(b => ({ ...b, timeline_months: parseInt(e.target.value) }))} className="w-full mt-2" />
                <div className="flex justify-between text-xs text-text3 mt-1"><span>1mo</span><span>24mo</span></div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected DAU at Launch">
                <input type="number" className={inputCls} value={brief.expected_dau_launch}
                  onChange={e => setBrief(b => ({ ...b, expected_dau_launch: parseInt(e.target.value) || 0 }))} />
              </Field>
              <Field label="Expected DAU in 1 Year">
                <input type="number" className={inputCls} value={brief.expected_dau_1year}
                  onChange={e => setBrief(b => ({ ...b, expected_dau_1year: parseInt(e.target.value) || 0 }))} />
              </Field>
            </div>
          </div>

          {/* Priority Axis */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.4s' }}>
            <h2 className="font-sans font-bold text-white text-sm uppercase tracking-widest">Priority Axis</h2>
            <p className="text-text3 text-xs">Drag to adjust — must sum to 100%</p>
            {(['speed','scalability','cost'] as const).map(key => {
              const labels = { speed: 'Speed to Market', scalability: 'Scalability', cost: 'Cost Efficiency' }
              const colors = { speed: 'var(--accent)', scalability: 'var(--accent3)', cost: 'var(--accent4)' }
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: colors[key] }}>{labels[key]}</span>
                    <span className="text-text2">{Math.round(brief.priority_axis[key] * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={Math.round(brief.priority_axis[key] * 100)}
                    onChange={e => {
                      const val = parseInt(e.target.value) / 100
                      setBrief(b => ({ ...b, priority_axis: { ...b.priority_axis, [key]: val } }))
                    }}
                    className="w-full" />
                </div>
              )
            })}
          </div>

          {/* Non-Functionals */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.5s' }}>
            <h2 className="font-sans font-bold text-white text-sm uppercase tracking-widest">Non-Functional Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {NON_FUNCTIONALS.map(nf => (
                <button key={nf} onClick={() => toggleNF(nf)}
                  className={`px-2 py-1 rounded text-xs border transition-all ${
                    brief.non_functionals.includes(nf)
                      ? 'bg-accent2/10 border-accent2/40 text-purple-400'
                      : 'bg-surface2 border-border text-text3 hover:border-text3'
                  }`}>{nf}</button>
              ))}
            </div>
          </div>

          {/* Existing System */}
          <div className="bg-surface border border-border rounded p-6 space-y-4 slide-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setBrief(b => ({ ...b, has_existing_system: !b.has_existing_system }))}
                className={`w-10 h-5 rounded-full transition-all relative ${brief.has_existing_system ? 'bg-accent' : 'bg-surface3'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all ${brief.has_existing_system ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-text text-sm">Has existing system to migrate from</span>
            </div>
            {brief.has_existing_system && (
              <Field label="Existing System Description">
                <textarea className={inputCls} rows={3} value={brief.existing_system_description}
                  onChange={e => setBrief(b => ({ ...b, existing_system_description: e.target.value }))}
                  placeholder="Describe the current tech stack, pain points, and migration constraints..." />
              </Field>
            )}
          </div>

          {error && (
            <div className="bg-accent5/10 border border-accent5/30 text-accent5 rounded px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 rounded font-sans font-bold text-sm uppercase tracking-widest transition-all relative overflow-hidden"
            style={{ background: loading ? 'var(--surface2)' : 'var(--accent)', color: loading ? 'var(--text3)' : '#080b10' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="agent-dot"><span/><span/><span/></span>
                Launching Debate...
              </span>
            ) : (
              '◆ Launch 19-Agent Debate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
