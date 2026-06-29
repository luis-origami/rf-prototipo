/* Mini-gráfico de tendência (sparkline) — uma linha enxuta sob o KPI, só a
   forma da série recente. Cor pela leitura de melhora/piora da métrica
   (verde = bom, vermelho = ruim, aço = neutro). Sem eixos, sem tooltip. */

export type SparklineTone = 'good' | 'bad' | 'neutral'

const TONE_TEXT: Record<SparklineTone, string> = {
  good: 'text-pago-base',
  bad: 'text-atrasado-base',
  neutral: 'text-steel-400',
}

interface SparklineProps {
  data: number[]
  tone?: SparklineTone
  className?: string
}

const W = 100
const H = 28
const PAD = 3 // respiro vertical para o traço não cortar no topo/base

export function Sparkline({ data, tone = 'neutral', className = '' }: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const x = (i: number) => (i / (data.length - 1)) * W
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - 2 * PAD)
  const pontos = data.map((v, i) => `${x(i)},${y(v)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`${TONE_TEXT[tone]} ${className}`}
      aria-hidden="true"
    >
      <polyline
        points={pontos}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
