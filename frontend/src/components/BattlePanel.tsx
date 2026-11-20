import { useDebateStore } from '../store/debateStore'
import { AGENT_META } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SEV_STYLE: Record<string, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5', badge: '#ef4444', glow: '#ef444420' },
  Major:    { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#fde68a', badge: '#f59e0b', glow: '#f59e0b20' },
  Minor:    { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8', badge: '#64748b', glow: '#64748b20' },
}

// Flexible cost color — handles any string Claude might return for cost_vs_budget
function getCostColor(status: string): string {
  const s = (status || '').toUpperCase()
  if (s.includes('WELL') || s.includes('CRITICAL') || s.includes('EXCEED')) return '#ef4444'
  if (s.includes('OVER') || s.includes('HIGH') || s.includes('ABOVE')) return '#f59e0b'
  if (s.includes('WITHIN') || s.includes('UNDER') || s.includes('BELOW') || s.includes('OK') || s.includes('GOOD')) return '#10b981'
  return '#64748b'
}

function CostChart() {
  const costData = useDebateStore(s => s.costChartData)

  if (costData.length === 0) return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      <span className="text-2xl">💰</span>
      <p className="text-text3 text-[10px]">Cost data will appear when AGENT-10 analyzes proposals</p>
    </div>
  )

  const sorted = [...costData].sort((a, b) => a.monthly_usd - b.monthly_usd)

  return (
    <div className="space-y-3">
      <div className="text-[9px] uppercase tracking-widest text-text3">Monthly Infrastructure Cost (USD)</div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={sorted} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
          <XAxis
            dataKey="agent_id"
            tick={{ fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => v.replace('AGENT-', 'A')}
          />
          <YAxis tick={{ fontSize: 8, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 4, fontSize: 10 }}
            formatter={(val: number, _: string, entry: any) => [
              `$${val.toLocaleString()}/mo — ${entry.payload.cost_vs_budget}`,
              entry.payload.agent_name,
            ]}
          />
          <Bar dataKey="monthly_usd" radius={[3, 3, 0, 0]}>
            {sorted.map((entry, i) => (
              <Cell
                key={i}
                fill={getCostColor(entry.cost_vs_budget)}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="space-y-1">
        {sorted.map(d => (
          <div key={d.agent_id} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: getCostColor(d.cost_vs_budget) }}
            />
            <span className="text-[10px] text-text3 flex-1 truncate">{d.agent_name}</span>
            <span className="text-[10px] font-mono" style={{ color: getCostColor(d.cost_vs_budget) }}>
              ${d.monthly_usd.toLocaleString()}/mo
            </span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest"
              style={{
                background: `${getCostColor(d.cost_vs_budget)}18`,
                color: getCostColor(d.cost_vs_budget),
                border: `1px solid ${getCostColor(d.cost_vs_budget)}35`,
              }}
            >
              {d.cost_vs_budget}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BattlePanel() {
  const critiques = useDebateStore(s => s.critiques)

  // Severity tally
  const critical = critiques.filter(c => c.severity === 'Critical').length
  const major = critiques.filter(c => c.severity === 'Major').length
  const minor = critiques.filter(c => c.severity === 'Minor').length

  return (
    <div className="flex flex-col h-full rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: '#ff6b6b' }}>
          ⚔️ Agent Battle
        </div>
        <div className="flex items-center gap-2">
          {critical > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>{critical} Critical</span>}
          {major > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>{major} Major</span>}
          {minor > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#64748b20', color: '#64748b', border: '1px solid #64748b40' }}>{minor} Minor</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cost Section */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <CostChart />
        </div>

        {/* Critiques */}
        <div className="p-3 space-y-3">
          {critiques.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-center gap-2">
              <span className="text-3xl">⚔️</span>
              <p className="text-text3 text-xs">Devil's Advocate will attack all proposals in Phase 2</p>
            </div>
          )}
          {critiques.map((c, i) => {
            const targetMeta = AGENT_META[c.target] || { emoji: '🤖', color: '#94a3b8' }
            const style = SEV_STYLE[c.severity] || SEV_STYLE.Minor
            return (
              <div key={i} className="rounded p-3 slide-in"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                <div className="flex items-start gap-2 mb-2">
                  <span>🔴</span>
                  <span className="text-xs">→</span>
                  <span>{targetMeta.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider"
                        style={{ color: targetMeta.color }}>
                        {c.target}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest"
                        style={{ background: `${style.badge}20`, color: style.badge, border: `1px solid ${style.badge}40` }}>
                        {c.severity}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-sans font-semibold mb-1.5" style={{ color: style.text }}>
                  {c.title}
                </p>
                <p className="text-[10px] text-text2 leading-relaxed mb-2">{c.critique}</p>
                {c.issues.length > 0 && (
                  <div className="space-y-1">
                    {c.issues.map((issue, j) => (
                      <div key={j} className="flex gap-2 text-[10px] text-text3">
                        <span style={{ color: style.badge }}>▸</span>{issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
