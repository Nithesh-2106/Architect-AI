import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  scorecard: Record<string, number | { score: number; max: number; notes?: string }>
}

export default function ScorecardChart({ scorecard }: Props) {
  const data = Object.entries(scorecard).map(([key, val]) => {
    const score = typeof val === 'number' ? val : val.score
    const max = typeof val === 'number' ? 10 : (val.max || 10)
    const notes = typeof val === 'number' ? '' : (val.notes || '')
    return {
      subject: key.replace(/_/g, ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      score,
      fullMark: max,
      notes,
    }
  })

  if (data.length === 0) return null

  return (
    <div className="rounded border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-[10px] uppercase tracking-widest text-accent mb-3">◆ Architecture Scorecard</div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#1e2d3d" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }} />
          <Radar name="Score" dataKey="score" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 4, fontSize: 11 }}
            formatter={(val: number, name: string, props: any) => [
              `${val}/${props.payload.fullMark} — ${props.payload.notes || ''}`, name
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {data.map(d => (
          <div key={d.subject} className="flex items-center gap-2">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
              <div className="h-full rounded-full" style={{ width: `${(d.score / d.fullMark) * 100}%`, background: 'var(--accent)' }} />
            </div>
            <span className="text-[9px] text-text2">{d.subject}: {d.score}/{d.fullMark}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
