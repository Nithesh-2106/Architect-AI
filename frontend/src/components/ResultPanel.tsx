import { useState } from 'react'
import { FinalArchitecture } from '../types'
import MermaidDiagram from './MermaidDiagram'
import ScorecardChart from './ScorecardChart'

interface Props {
  arch: FinalArchitecture
  pdfUrl: string | null
  docxUrl: string | null
}

type Tab = 'overview' | 'diagram' | 'adr' | 'risks' | 'costs' | 'timeline' | 'scorecard'

const TABS: { id: Tab; label: string }[] = [
  { id: 'diagram', label: '◈ Architecture' },
  { id: 'overview', label: 'Overview' },
  { id: 'adr', label: 'ADR' },
  { id: 'risks', label: 'Risks' },
  { id: 'costs', label: 'Costs' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'scorecard', label: 'Scorecard' },
]

const SEV_COLOR: Record<string, string> = {
  High: '#ef4444', Medium: '#f59e0b', Low: '#10b981',
}

export default function ResultPanel({ arch, pdfUrl, docxUrl }: Props) {
  const [tab, setTab] = useState<Tab>('diagram')

  const confidence = Math.round(arch.overall_confidence * 100)

  return (
    <div className="rounded border flex flex-col h-full" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-accent3 mb-1">◆ Final Architecture</div>
            <h2 className="font-sans font-black text-2xl text-white" style={{ letterSpacing: '-0.5px' }}>
              {arch.pattern?.toUpperCase()} ARCHITECTURE
            </h2>
            <p className="text-text3 text-xs mt-1">
              Confidence: <span className="text-accent3 font-bold">{confidence}%</span>
              &nbsp;·&nbsp; {Object.keys(arch.tech_stack || {}).length} stack layers
              &nbsp;·&nbsp; {(arch.components || []).length} components
              &nbsp;·&nbsp; {(arch.risk_register || []).length} risks identified
            </p>
          </div>
          {/* Download buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {pdfUrl && (
              <a href={pdfUrl} download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-bold uppercase tracking-wider transition-all hover:opacity-90"
                style={{ background: 'var(--accent5)', color: 'white' }}>
                ↓ PDF
              </a>
            )}
            {docxUrl && (
              <a href={docxUrl} download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-bold uppercase tracking-wider transition-all hover:opacity-90"
                style={{ background: 'var(--accent2)', color: 'white' }}>
                ↓ DOCX
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1 rounded text-xs whitespace-nowrap transition-all"
              style={{
                background: tab === t.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
                border: `1px solid ${tab === t.id ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {tab === 'overview' && (() => {
          // Layer descriptions to explain each tech stack entry
          const LAYER_DESC: Record<string, string> = {
            backend: 'Core application server, API handling, business logic',
            frontend: 'Client-side UI, user-facing application layer',
            database_primary: 'Primary data store, main persistence layer',
            database_cache: 'In-memory caching layer, hot-path acceleration',
            messaging: 'Async event bus, inter-service communication',
            deployment: 'Infrastructure & container orchestration platform',
            monitoring: 'Observability, metrics, logging and alerting',
            ci_cd: 'Continuous integration and deployment pipeline',
            security: 'Authentication, authorization, secrets management',
            search: 'Full-text search and indexing layer',
          }
          const LAYER_ICONS: Record<string, string> = {
            backend: '⚙️', frontend: '🖥️', database_primary: '🗄️',
            database_cache: '⚡', messaging: '📨', deployment: '🚀',
            monitoring: '📊', ci_cd: '🔄', security: '🔐', search: '🔍',
          }
          const techEntries = Object.entries(arch.tech_stack || {})
          const apiTypeColors: Record<string, string> = {
            REST: '#00d4ff', gRPC: '#a855f7', Event: '#f59e0b',
            GraphQL: '#10b981', WebSocket: '#06b6d4',
          }
          return (
            <div className="space-y-7">

              {/* Pattern Banner */}
              <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(0,212,255,0.02))', border: '1px solid rgba(0,212,255,0.18)' }}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}>
                    ⚖️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold"
                        style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
                        ◆ {arch.pattern?.toUpperCase()} ARCHITECTURE
                      </span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap">{arch.summary}</p>
                    {arch.why_this_wins && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
                        <div className="text-[9px] uppercase tracking-widest text-accent mb-1">Why This Architecture Won The Debate</div>
                        <p className="text-xs text-text2 leading-relaxed">{arch.why_this_wins}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Data Flow */}
              {arch.data_flow && (
                <div className="rounded-xl p-5 bg-surface2 border border-border">
                  <div className="text-[10px] uppercase tracking-widest text-accent3 mb-3 flex items-center gap-2">
                    <span className="text-base">🔄</span> System Data Flow
                  </div>
                  <p className="text-xs text-text2 leading-relaxed whitespace-pre-wrap italic">
                    {arch.data_flow}
                  </p>
                </div>
              )}

              {/* Tech Stack Deep Dive */}
              {techEntries.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 mb-3 flex items-center gap-2">
                    <span style={{ color: 'var(--accent)' }}>◈</span> Technology Stack — Layer by Layer
                  </div>
                  <div className="space-y-2">
                    {techEntries.map(([layer, tech]) => (
                      <div key={layer} className="rounded-lg px-4 py-3"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-start gap-3">
                          <span className="text-base flex-shrink-0 mt-0.5">{LAYER_ICONS[layer] || '⬡'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[9px] uppercase tracking-widest text-text3">{layer.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-sans font-bold text-white truncate max-w-[55%] text-right">{tech as string}</span>
                            </div>
                            {LAYER_DESC[layer] && (
                              <p className="text-[10px] text-text3 leading-relaxed">{LAYER_DESC[layer]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Component Catalog */}
              {(arch.components || []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 mb-3 flex items-center gap-2">
                    <span style={{ color: 'var(--accent)' }}>◈</span> Component Catalog ({arch.components.length} components)
                  </div>
                  <div className="space-y-2">
                    {arch.components.map((c, i) => {
                      const apiColor = apiTypeColors[(c as any).api_type] || 'var(--text3)'
                      return (
                        <div key={i} className="rounded-lg px-4 py-3"
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-accent text-xs flex-shrink-0">◈</span>
                              <span className="text-xs font-sans font-bold text-white truncate">{c.name}</span>
                              {c.tech && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{ background: 'var(--surface3)', color: 'var(--text2)' }}>
                                  {c.tech}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {(c as any).api_type && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold flex-shrink-0"
                                  style={{ background: `${apiColor}18`, color: apiColor, border: `1px solid ${apiColor}35` }}>
                                  {(c as any).api_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-text2 leading-relaxed pl-4">{c.purpose}</p>
                          {(c as any).scale_target && (
                            <p className="text-[9px] text-text3 pl-4 mt-0.5">Scale: {(c as any).scale_target}</p>
                          )}
                          {c.deployment && (
                            <p className="text-[9px] text-text3 pl-4 mt-0.5">Deploy: {c.deployment}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Components', value: (arch.components || []).length, color: '#00d4ff', unit: '' },
                  { label: 'Stack Layers', value: Object.keys(arch.tech_stack || {}).length, color: '#8b5cf6', unit: '' },
                  { label: 'Risks', value: (arch.risk_register || []).length, color: '#ef4444', unit: '' },
                  { label: 'Monthly', value: `$${((arch.cost_projection?.monthly_usd || 0)/1000).toFixed(1)}k`, color: '#10b981', unit: '' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3 text-center"
                    style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                    <div className="text-[8px] uppercase tracking-widest text-text3 mb-1">{s.label}</div>
                    <div className="font-sans font-black text-lg" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

            </div>
          )
        })()}

        {tab === 'diagram' && (
          <div className="space-y-6">
            {/* Diagram header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold"
                    style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.25)' }}
                  >
                    ◆ {arch.pattern?.toUpperCase()} ARCHITECTURE
                  </span>
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    {confidence}% Confidence
                  </span>
                </div>
                <p className="text-[10px] text-text3">Synthesized from 19-agent debate · Scroll or zoom to explore</p>
              </div>
            </div>

            {/* Diagram */}
            {arch.mermaid_diagram ? (
              <MermaidDiagram diagram={arch.mermaid_diagram} />
            ) : (
              <div className="flex items-center justify-center h-40 rounded-xl text-text3 text-xs"
                style={{ border: '1px dashed var(--border)' }}>
                No diagram generated
              </div>
            )}

            {/* Summary Section */}
            <div className="space-y-4 pt-2">
              {/* Why this wins */}
              {(arch as any).why_this_wins && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,212,255,0.02))',
                    border: '1px solid rgba(0,212,255,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: '#00d4ff' }}>⚖️</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#00d4ff' }}>
                      Why This Architecture Wins
                    </span>
                  </div>
                  <p className="text-xs text-text2 leading-relaxed">{(arch as any).why_this_wins}</p>
                </div>
              )}

              {/* Executive summary */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">Executive Summary</div>
                <p className="text-xs text-text2 leading-relaxed whitespace-pre-wrap">{arch.summary}</p>
              </div>

              {/* Data Flow snippet */}
              {arch.data_flow && (
                <div className="rounded-lg p-4 bg-surface2 border border-border">
                  <div className="text-[9px] uppercase tracking-widest text-accent3 mb-2 flex items-center gap-2">
                    <span className="text-sm">🔄</span> Complete Data Flow
                  </div>
                  <p className="text-[11px] text-text2 leading-relaxed italic">{arch.data_flow}</p>
                </div>
              )}

              {/* Tech stack chips */}
              {arch.tech_stack && Object.keys(arch.tech_stack).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">Technology Stack</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(arch.tech_stack).map(([layer, tech]) => (
                      <div
                        key={layer}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <span className="text-[8px] uppercase tracking-widest text-text3">{layer.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-white font-semibold">{tech as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Components */}
              {(arch.components || []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 mb-2">Key Components ({arch.components.length})</div>
                  <div className="grid grid-cols-2 gap-2">
                    {arch.components.slice(0, 8).map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                      >
                        <span className="text-accent mt-0.5 text-xs">◈</span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-sans font-bold text-white truncate">{c.name}</div>
                          {c.tech && <div className="text-[9px] text-text3 truncate">{c.tech}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                  <div className="text-[8px] uppercase tracking-widest text-text3 mb-1">Risks</div>
                  <div className="font-sans font-black text-xl" style={{ color: '#00d4ff' }}>{(arch.risk_register || []).length}</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="text-[8px] uppercase tracking-widest text-text3 mb-1">Monthly</div>
                  <div className="font-sans font-black text-xl" style={{ color: '#10b981' }}>
                    ${((arch.cost_projection?.monthly_usd || 0) / 1000).toFixed(1)}k
                  </div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <div className="text-[8px] uppercase tracking-widest text-text3 mb-1">MVP</div>
                  <div className="font-sans font-black text-xl text-purple-400">
                    {arch.timeline?.mvp_weeks}w
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'adr' && (() => {
          const adrText = arch.adr || 'No ADR generated.'
          const copyADR = () => navigator.clipboard.writeText(adrText)
          // Simple markdown heading renderer
          const renderADR = (text: string) =>
            text.split('\n').map((line, i) => {
              if (line.startsWith('### '))
                return <div key={i} className="text-[10px] uppercase tracking-widest font-bold mt-4 mb-1" style={{ color: 'var(--accent3)' }}>{line.slice(4)}</div>
              if (line.startsWith('## '))
                return <div key={i} className="text-xs font-sans font-black mt-5 mb-2 text-white">{line.slice(3)}</div>
              if (line.startsWith('# '))
                return <div key={i} className="text-sm font-sans font-black mt-5 mb-2 text-white">{line.slice(2)}</div>
              if (line.startsWith('- '))
                return <div key={i} className="flex gap-2 text-[10px] text-text2 mb-0.5"><span style={{ color: 'var(--accent)' }}>▸</span>{line.slice(2)}</div>
              if (line.trim() === '')
                return <div key={i} className="h-2" />
              return <div key={i} className="text-[11px] text-text2 leading-relaxed">{line}</div>
            })
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest text-text3">Architecture Decision Record</div>
                <button
                  onClick={copyADR}
                  className="text-[9px] px-2 py-1 rounded transition-all hover:text-accent"
                  style={{ color: 'var(--text3)', border: '1px solid var(--border)' }}
                >
                  📋 Copy
                </button>
              </div>
              <div className="rounded p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                {renderADR(adrText)}
              </div>
            </div>
          )
        })()}

        {tab === 'risks' && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-3">Risk Register</div>
            {(arch.risk_register || []).length === 0 ? (
              <p className="text-text3 text-xs">No risks recorded.</p>
            ) : (
              <div className="space-y-3">
                {arch.risk_register.map((r, i) => {
                  const color = SEV_COLOR[r.severity] || 'var(--text3)'
                  return (
                    <div key={i} className="rounded p-4"
                      style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded uppercase text-[8px] tracking-widest"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                          {r.severity}
                        </span>
                        {r.likelihood && (
                        <span className="text-xs px-2 py-0.5 rounded uppercase text-[8px] tracking-widest text-text3"
                          style={{ background: 'var(--surface3)' }}>
                          {r.likelihood} likelihood
                        </span>
                        )}
                      </div>
                      <p className="text-xs font-sans font-semibold text-white mb-1">{r.risk}</p>
                      <p className="text-[10px] text-text2">
                        <span className="text-accent3">Mitigation:</span> {r.mitigation}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'costs' && (
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-text3">Cost Projection (12-month)</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-text3 text-[10px] uppercase tracking-widest mb-1">Monthly</div>
                <div className="font-sans font-black text-2xl text-accent3">
                  ${(arch.cost_projection?.monthly_usd || 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded p-4 text-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="text-text3 text-[10px] uppercase tracking-widest mb-1">Yearly</div>
                <div className="font-sans font-black text-2xl text-purple-400">
                  ${(arch.cost_projection?.yearly_usd || 0).toLocaleString()}
                </div>
              </div>
            </div>
            {arch.cost_projection?.breakdown && (
              <div className="space-y-2">
                {Object.entries(arch.cost_projection.breakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-2 rounded"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <span className="text-[10px] text-text3 uppercase">{k}</span>
                    <span className="text-[10px] text-text">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {(arch.cost_projection as any)?.assumptions && (
              <p className="text-[10px] text-text3 italic">{(arch.cost_projection as any).assumptions}</p>
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded p-4 text-center" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <div className="text-[10px] uppercase tracking-widest text-text3 mb-1">MVP</div>
                <div className="font-sans font-black text-xl text-accent">{arch.timeline?.mvp_weeks} weeks</div>
              </div>
              <div className="rounded p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-[10px] uppercase tracking-widest text-text3 mb-1">Production</div>
                <div className="font-sans font-black text-xl text-accent3">{arch.timeline?.production_weeks} weeks</div>
              </div>
            </div>
            <div className="space-y-3">
              {(arch.timeline?.phases || []).map((phase, i) => (
                <div key={i} className="rounded p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-sans font-bold text-white">{phase.name}</span>
                    <span className="text-[10px] text-text3">{phase.duration_weeks} weeks</span>
                  </div>
                  <div className="space-y-1">
                    {(phase.deliverables || []).map((d, j) => (
                      <div key={j} className="flex gap-2 text-[10px] text-text2">
                        <span className="text-accent3">→</span>{d}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'scorecard' && (
          <ScorecardChart scorecard={arch.scorecard || {}} />
        )}
      </div>
    </div>
  )
}
