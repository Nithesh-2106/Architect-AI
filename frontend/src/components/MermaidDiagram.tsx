import { useEffect, useRef, useState } from 'react'

interface Props {
  diagram: string
}

export default function MermaidDiagram({ diagram }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])

  useEffect(() => {
    if (!diagram || !ref.current) return
    setRendered(false)
    setError(null)

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            // Canvas & node backgrounds
            background: 'transparent',
            primaryColor: '#0f1923',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#00d4ff',
            lineColor: '#00d4ff',
            secondaryColor: '#0d1f2d',
            tertiaryColor: '#0a1520',
            edgeLabelBackground: '#0d1117',
            clusterBkg: '#0d1f2d',
            clusterBorder: '#1e3a5f',
            titleColor: '#00d4ff',
            // Node-specific
            nodeBorder: '#00d4ff',
            mainBkg: '#0f1923',
            nodeTextColor: '#e2e8f0',
            // Special nodes
            specialStateColor: '#00d4ff',
            // Edge colors
            edgeColor: '#00d4ff',
            // Font
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            nodeSpacing: 50,
            rankSpacing: 60,
            padding: 20,
          },
        })

        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, diagram)

        if (ref.current) {
          ref.current.innerHTML = svg

          // Post-process SVG for premium look
          const svgEl = ref.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.filter = 'drop-shadow(0 4px 24px rgba(0,212,255,0.12))'

            // Style all rect nodes
            svgEl.querySelectorAll('.node rect, .node circle, .node polygon').forEach((el: any) => {
              el.style.stroke = '#00d4ff'
              el.style.strokeWidth = '1.5px'
              el.style.filter = 'drop-shadow(0 0 6px rgba(0,212,255,0.3))'
            })

            // Style edge paths
            svgEl.querySelectorAll('.edgePath path').forEach((el: any) => {
              el.style.stroke = '#00d4ff'
              el.style.strokeOpacity = '0.6'
              el.style.strokeWidth = '1.5px'
            })

            // Style edge labels
            svgEl.querySelectorAll('.edgeLabel').forEach((el: any) => {
              el.style.background = '#0d1117'
              el.style.color = '#94a3b8'
              el.style.fontSize = '11px'
            })

            // Style cluster labels
            svgEl.querySelectorAll('.cluster-label').forEach((el: any) => {
              el.style.fill = '#00d4ff'
              el.style.fontSize = '11px'
              el.style.fontWeight = '700'
            })
          }

          setRendered(true)
        }
      } catch (e: any) {
        setError(`Could not render diagram: ${e.message || 'Unknown error'}`)
      }
    }

    render()
  }, [diagram])

  const copySource = () => {
    navigator.clipboard.writeText(diagram)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="text-accent5 text-xs font-bold">⚠ Diagram render failed</span>
        </div>
        <p className="text-text3 text-[10px]">{error}</p>
        <details>
          <summary className="text-[10px] text-text3 cursor-pointer">View source</summary>
          <pre className="mt-2 text-[10px] text-text3 overflow-x-auto bg-surface2 p-3 rounded">{diagram}</pre>
        </details>
      </div>
    )
  }

  return (
    <div className={
      isFullscreen 
        ? "fixed inset-0 z-50 flex flex-col p-8" 
        : "space-y-0 relative"
    } style={
      isFullscreen 
        ? { background: 'var(--bg)' } 
        : {}
    }>
      {isFullscreen && <div className="grid-bg" />}
      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all hover:text-accent"
            style={{ border: '1px solid var(--border)', color: 'var(--text3)', background: 'var(--surface2)' }}
          >−</button>
          <span className="text-[10px] text-text3 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all hover:text-accent"
            style={{ border: '1px solid var(--border)', color: 'var(--text3)', background: 'var(--surface2)' }}
          >+</button>
          <button
            onClick={() => setZoom(1)}
            className="text-[9px] px-2 py-1 rounded transition-all hover:text-accent"
            style={{ border: '1px solid var(--border)', color: 'var(--text3)', background: 'var(--surface2)' }}
          >Reset</button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-[9px] px-2 py-1 rounded transition-all hover:text-accent ml-2 flex items-center gap-1"
            style={{ border: '1px solid var(--border)', color: isFullscreen ? 'var(--accent)' : 'var(--text3)', background: 'var(--surface2)' }}
          >
            {isFullscreen ? '⤡ Exit Fullscreen (Esc)' : '⤢ Fullscreen'}
          </button>
        </div>
        <button
          onClick={copySource}
          className="text-[9px] px-2 py-1 rounded transition-all"
          style={{
            border: '1px solid var(--border)',
            color: copied ? 'var(--accent3)' : 'var(--text3)',
            background: 'var(--surface2)',
          }}
        >
          {copied ? '✓ Copied' : '📋 Copy Source'}
        </button>
      </div>

      {/* Diagram canvas */}
      <div
        className={`rounded-xl overflow-auto ${isFullscreen ? 'flex-1' : ''}`}
        style={{
          background: 'linear-gradient(135deg, #080d14 0%, #0d1520 50%, #080d14 100%)',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 0 40px rgba(0,212,255,0.06), inset 0 0 60px rgba(0,0,0,0.4)',
          minHeight: 200,
          maxHeight: isFullscreen ? 'none' : 520,
          position: 'relative',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(0,212,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            borderRadius: 12,
          }}
        />

        {/* Corner accents */}
        {[['top-0 left-0', 'border-t border-l'], ['top-0 right-0', 'border-t border-r'],
          ['bottom-0 left-0', 'border-b border-l'], ['bottom-0 right-0', 'border-b border-r']].map(([pos, cls], i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 ${cls} rounded-sm`}
            style={{ borderColor: 'rgba(0,212,255,0.4)', margin: 6 }} />
        ))}

        {!rendered && (
          <div className="flex items-center justify-center h-48 gap-2 text-text3 text-xs relative z-10">
            <span className="agent-dot"><span/><span/><span/></span>
            Rendering architecture diagram...
          </div>
        )}

        <div
          className="relative z-10 flex justify-center items-start p-6"
          style={{ minHeight: 200 }}
        >
          <div
            ref={ref}
            className={`mermaid transition-transform duration-300 ${isFullscreen ? 'mermaid-fullscreen' : ''}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
